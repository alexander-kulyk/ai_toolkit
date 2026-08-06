#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const positional = args.filter((arg) => !arg.startsWith('--'));
const startPath = resolve(positional[0] ?? process.cwd());

function statSafe(path) { try { return statSync(path); } catch { return null; } }
function findRoot(start) {
  let current = statSafe(start)?.isDirectory() ? start : dirname(start);
  while (true) {
    if (existsSync(join(current, 'package.json'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function read(path) { try { return readFileSync(path, 'utf8'); } catch { return ''; } }
function json(path) { try { return JSON.parse(read(path)); } catch { return null; } }
function add(findings, severity, code, message, evidence) {
  findings.push({ severity, code, message, ...(evidence ? { evidence } : {}) });
}

function hasWorkspaceSignal(root, pkg) {
  return Boolean(
    pkg?.workspaces
    || existsSync(join(root, 'pnpm-workspace.yaml'))
    || existsSync(join(root, 'lerna.json'))
    || existsSync(join(root, 'nx.json'))
    || existsSync(join(root, 'turbo.json')),
  );
}

function findWorkspaceRoot(packageRoot) {
  let current = packageRoot;
  let workspaceRoot = null;

  while (true) {
    const pkg = json(join(current, 'package.json'));
    if (hasWorkspaceSignal(current, pkg)) workspaceRoot = current;

    const parent = dirname(current);
    if (parent === current) return workspaceRoot;
    current = parent;
  }
}

function findNestedPackageRoots(root, maxDepth = 3) {
  const ignored = new Set([
    'node_modules', 'dist', 'build', 'coverage', 'out', '.next', '.turbo', '.git',
  ]);
  const found = [];
  const queue = [{ directory: root, depth: 0 }];

  while (queue.length) {
    const { directory, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || ignored.has(entry.name)) continue;
      const child = join(directory, entry.name);
      if (existsSync(join(child, 'package.json'))) {
        found.push(child);
      } else {
        queue.push({ directory: child, depth: depth + 1 });
      }
    }
  }

  return found;
}

if (!statSafe(startPath)) {
  console.error(`Path does not exist: ${startPath}`);
  process.exit(2);
}

const packageRoot = findRoot(startPath);
if (!packageRoot) {
  console.error(`No package.json found from ${startPath} upward.`);
  process.exit(2);
}
const workspaceRoot = findWorkspaceRoot(packageRoot);
const projectRoot = workspaceRoot ?? packageRoot;
const pkg = json(join(packageRoot, 'package.json'));
if (!pkg) {
  console.error('package.json is invalid JSON.');
  process.exit(2);
}

const projectPkg = projectRoot === packageRoot
  ? pkg
  : json(join(projectRoot, 'package.json'));
const nestedPackageRoots = packageRoot === projectRoot && workspaceRoot
  ? findNestedPackageRoots(projectRoot)
  : [];
const packageManifests = [
  projectPkg,
  ...(packageRoot === projectRoot ? [] : [pkg]),
  ...nestedPackageRoots.map((root) => json(join(root, 'package.json'))),
].filter(Boolean);

const findings = [];
const scripts = pkg.scripts ?? {};
const allDeps = Object.assign({}, ...packageManifests.map((manifest) => ({
  ...(manifest.dependencies ?? {}),
  ...(manifest.devDependencies ?? {}),
  ...(manifest.peerDependencies ?? {}),
  ...(manifest.optionalDependencies ?? {}),
})));
const has = (name) => Object.hasOwn(allDeps, name);
const lockfiles = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'npm-shrinkwrap.json', 'bun.lock', 'bun.lockb']
  .filter((file) => existsSync(join(projectRoot, file)) || existsSync(join(packageRoot, file)));

if (
  !pkg.engines?.node
  && !projectPkg?.engines?.node
  && !existsSync(join(projectRoot, '.nvmrc'))
  && !existsSync(join(projectRoot, '.node-version'))
  && !existsSync(join(packageRoot, '.nvmrc'))
  && !existsSync(join(packageRoot, '.node-version'))
  && !pkg.volta?.node
  && !projectPkg?.volta?.node
) {
  add(findings, 'info', 'NODE_VERSION_NOT_PINNED', 'No Node.js version policy was detected in package.json engines, .nvmrc, .node-version, or Volta. Pinning a supported runtime improves reproducibility.');
}
if (!pkg.packageManager && !projectPkg?.packageManager && lockfiles.length === 0) {
  add(findings, 'warning', 'PACKAGE_MANAGER_UNCLEAR', 'No packageManager field or recognized lockfile was detected. Reproducible installs may be ambiguous.');
}
if (lockfiles.length > 1) {
  add(findings, 'warning', 'MULTIPLE_LOCKFILES', 'Multiple package-manager lockfiles were detected.', lockfiles.join(', '));
}
if (!scripts.test) add(findings, 'info', 'NO_TEST_SCRIPT', 'No test script is declared in package.json.');
if (!scripts.lint) add(findings, 'info', 'NO_LINT_SCRIPT', 'No lint script is declared in package.json.');
if (
  (has('typescript') || existsSync(join(packageRoot, 'tsconfig.json')) || existsSync(join(projectRoot, 'tsconfig.json')))
  && !scripts.typecheck
  && !scripts['type-check']
) {
  add(findings, 'info', 'NO_TYPECHECK_SCRIPT', 'TypeScript is present but no dedicated typecheck script was detected. A build script may still typecheck.');
}
if (scripts.start && /nodemon|ts-node-dev/i.test(scripts.start)) {
  add(findings, 'warning', 'DEV_RUNNER_IN_START', 'The start script appears to use a development watcher/runner. Verify the production command uses built output and handles signals correctly.', scripts.start);
}
if (has('typeorm')) {
  add(findings, 'info', 'TYPEORM_SYNC_REVIEW', 'TypeORM detected. Verify synchronize is disabled outside disposable development/test databases and production uses migrations.');
}
if (has('mongoose')) {
  add(findings, 'info', 'MONGOOSE_SENSITIVE_FIELDS', 'Mongoose detected. Verify password hashes/tokens are excluded by default from projections and serializers.');
}
if (has('express')) {
  add(findings, 'info', 'EXPRESS_PROXY_LIMITS_REVIEW', 'Express detected. Verify trust proxy, request body limits, centralized errors, secure cookies, and graceful shutdown match the deployment topology.');
}
if (has('@nestjs/core')) {
  add(findings, 'info', 'NEST_GLOBAL_BOUNDARIES_REVIEW', 'NestJS detected. Verify global validation, exception mapping, auth guards, serialization, and graceful shutdown behavior.');
}
if (has('fastify')) {
  add(findings, 'info', 'FASTIFY_SCHEMA_REVIEW', 'Fastify detected. Verify route schemas, plugin encapsulation, payload limits, and installed-major plugin compatibility.');
}

const gitignore = [read(join(projectRoot, '.gitignore')), read(join(packageRoot, '.gitignore'))]
  .filter(Boolean)
  .join('\n');
if (!gitignore) {
  add(findings, 'warning', 'NO_GITIGNORE', 'No .gitignore was found at the package root. Ensure secrets and generated files cannot be committed.');
} else if (!/(^|\n)\.env(\n|$|\*)|\.env\.local|\.env\*/m.test(gitignore)) {
  add(findings, 'warning', 'ENV_NOT_IGNORED', '.gitignore does not clearly ignore local .env files. Keep .env.example/template files tracked but secret values ignored.');
}

const envTemplate = ['.env.example', '.env.sample', '.env.template']
  .find((file) => existsSync(join(packageRoot, file)) || existsSync(join(projectRoot, file)));
if (!envTemplate) {
  add(findings, 'info', 'NO_ENV_TEMPLATE', 'No .env.example/.env.sample/.env.template was detected. Document required configuration without real secrets.');
}

const dockerfile = read(join(packageRoot, 'Dockerfile')) || read(join(projectRoot, 'Dockerfile'));
if (dockerfile) {
  if (/^USER\s+root\s*$/mi.test(dockerfile) || !/^USER\s+/mi.test(dockerfile)) {
    add(findings, 'info', 'DOCKER_USER_REVIEW', 'Dockerfile does not clearly switch to a non-root runtime user. Verify whether the final image runs with least privilege.');
  }
  if (
    /COPY\s+\.\s+\./i.test(dockerfile)
    && !existsSync(join(packageRoot, '.dockerignore'))
    && !existsSync(join(projectRoot, '.dockerignore'))
  ) {
    add(findings, 'warning', 'NO_DOCKERIGNORE', 'Dockerfile copies the repository but no .dockerignore was detected. Build context may include secrets or unnecessary files.');
  }
}

const result = { root: packageRoot, projectRoot, workspaceRoot, summary: {
  warning: findings.filter((f) => f.severity === 'warning').length,
  info: findings.filter((f) => f.severity === 'info').length,
}, findings };

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`# Node.js project audit\n`);
  console.log(`Project root: ${projectRoot}`);
  if (packageRoot !== projectRoot) console.log(`Package root: ${packageRoot}`);
  console.log(`Findings: ${result.summary.warning} warning(s), ${result.summary.info} review note(s)\n`);
  if (!findings.length) console.log('No findings from the lightweight static checks.');
  for (const finding of findings) {
    console.log(`- [${finding.severity.toUpperCase()}] ${finding.code}: ${finding.message}${finding.evidence ? ` Evidence: ${finding.evidence}` : ''}`);
  }
  console.log('\nThese are review prompts, not proof of a defect. Confirm against repository and deployment context.');
}
