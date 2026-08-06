#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const positional = args.filter((arg) => !arg.startsWith('--'));
const startPath = resolve(positional[0] ?? process.cwd());

function safeJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function findPackageRoot(start) {
  let current = statSafe(start)?.isDirectory() ? start : dirname(start);
  while (true) {
    if (existsSync(join(current, 'package.json'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function statSafe(path) {
  try { return statSync(path); } catch { return null; }
}

function firstExisting(root, names) {
  return names.find((name) => existsSync(join(root, name))) ?? null;
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
    const pkg = safeJson(join(current, 'package.json'));
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

function deps(pkg) {
  return {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
    ...(pkg?.peerDependencies ?? {}),
    ...(pkg?.optionalDependencies ?? {}),
  };
}

function present(all, names) {
  return names.filter((name) => Object.hasOwn(all, name));
}

function detectWorkspaces(root, pkg) {
  const signals = [];
  if (pkg?.workspaces) signals.push('package.json workspaces');
  if (existsSync(join(root, 'pnpm-workspace.yaml'))) signals.push('pnpm workspace');
  if (existsSync(join(root, 'lerna.json'))) signals.push('Lerna');
  if (existsSync(join(root, 'nx.json'))) signals.push('Nx');
  if (existsSync(join(root, 'turbo.json'))) signals.push('Turborepo');
  return signals;
}

if (!statSafe(startPath)) {
  console.error(`Path does not exist: ${startPath}`);
  process.exit(2);
}

const packageRoot = findPackageRoot(startPath);
if (!packageRoot) {
  console.error(`No package.json found from ${startPath} upward.`);
  process.exit(2);
}

const workspaceRoot = findWorkspaceRoot(packageRoot);
const projectRoot = workspaceRoot ?? packageRoot;
const pkgPath = join(packageRoot, 'package.json');
const pkg = safeJson(pkgPath);
if (!pkg) {
  console.error(`Cannot parse ${pkgPath}.`);
  process.exit(2);
}

const projectPkg = projectRoot === packageRoot
  ? pkg
  : safeJson(join(projectRoot, 'package.json'));
const nestedPackageRoots = packageRoot === projectRoot && workspaceRoot
  ? findNestedPackageRoots(projectRoot)
  : [];
const packageManifests = [
  projectPkg,
  ...(packageRoot === projectRoot ? [] : [pkg]),
  ...nestedPackageRoots.map((root) => safeJson(join(root, 'package.json'))),
].filter(Boolean);
const all = Object.assign({}, ...packageManifests.map(deps));
const moduleTypes = [...new Set(
  (packageRoot === projectRoot ? packageManifests : [pkg])
    .map((manifest) => manifest.type ?? 'commonjs/default'),
)];
const lockfileNames = [
  'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'npm-shrinkwrap.json', 'bun.lockb', 'bun.lock',
];
const lockfile = firstExisting(projectRoot, lockfileNames)
  ?? (projectRoot === packageRoot ? null : firstExisting(packageRoot, lockfileNames));
const packageManager = projectPkg?.packageManager ?? pkg.packageManager ?? (
  lockfile?.startsWith('pnpm') ? 'pnpm' :
  lockfile === 'yarn.lock' ? 'yarn' :
  lockfile?.startsWith('package-lock') || lockfile === 'npm-shrinkwrap.json' ? 'npm' :
  lockfile?.startsWith('bun') ? 'bun' : null
);

const frameworks = present(all, [
  '@nestjs/core', '@nestjs/common', 'express', 'fastify', 'koa', '@hapi/hapi',
  '@adonisjs/core', '@loopback/core', '@feathersjs/feathers', 'moleculer', 'hono',
]);
const api = present(all, [
  '@nestjs/graphql', 'graphql', 'apollo-server', '@apollo/server', 'mercurius', 'trpc', '@trpc/server',
]);
const validation = present(all, [
  'zod', 'joi', 'yup', 'ajv', 'class-validator', 'class-transformer', 'valibot', 'typia',
]);
const data = present(all, [
  '@prisma/client', 'prisma', 'typeorm', 'drizzle-orm', 'sequelize', 'knex', 'mongoose',
  'mongodb', 'pg', 'postgres', 'mysql2', 'mysql', 'better-sqlite3', 'sqlite3', 'ioredis', 'redis',
]);
const auth = present(all, [
  'passport', '@nestjs/passport', 'jsonwebtoken', 'jose', 'express-session', 'openid-client',
  'oauth4webapi', 'argon2', 'bcrypt', 'bcryptjs',
]);
const queues = present(all, [
  'bullmq', 'bull', '@nestjs/bull', '@nestjs/bullmq', 'amqplib', 'kafkajs', 'nats', '@aws-sdk/client-sqs',
]);
const testing = present(all, [
  'jest', 'vitest', 'mocha', 'ava', 'tap', 'supertest', '@nestjs/testing', 'testcontainers',
]);
const logging = present(all, ['pino', 'winston', 'bunyan', '@nestjs/pino']);
const telemetry = present(all, [
  '@opentelemetry/api', '@opentelemetry/sdk-node', 'prom-client', '@sentry/node', 'dd-trace',
]);

const tsconfig = firstExisting(packageRoot, ['tsconfig.json', 'tsconfig.build.json'])
  ?? (projectRoot === packageRoot ? null : firstExisting(projectRoot, ['tsconfig.json', 'tsconfig.build.json']));
const nodeVersionFile = firstExisting(projectRoot, ['.nvmrc', '.node-version', '.tool-versions', 'mise.toml', 'volta.json'])
  ?? (projectRoot === packageRoot ? null : firstExisting(packageRoot, ['.nvmrc', '.node-version', '.tool-versions', 'mise.toml', 'volta.json']));
const contextRoots = projectRoot === packageRoot ? [packageRoot] : [packageRoot, projectRoot];
const envFiles = ['.env.example', '.env.sample', '.env.template']
  .filter((file) => contextRoots.some((root) => existsSync(join(root, file))));
const deployFiles = [
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml',
  'serverless.yml', 'serverless.yaml', 'vercel.json', 'render.yaml', 'fly.toml',
].filter((file) => contextRoots.some((root) => existsSync(join(root, file))));

const result = {
  root: packageRoot,
  projectRoot,
  workspaceRoot,
  package: { name: pkg.name ?? basename(packageRoot), version: pkg.version ?? null, private: pkg.private ?? null },
  runtime: {
    engines: pkg.engines ?? projectPkg?.engines ?? null,
    packageManager,
    lockfile,
    nodeVersionFile,
    moduleType: moduleTypes.length === 1 ? moduleTypes[0] : `mixed (${moduleTypes.join(', ')})`,
    typescript: Boolean(tsconfig || all.typescript),
    tsconfig,
  },
  architecture: {
    workspaces: detectWorkspaces(projectRoot, projectPkg),
    workspacePackages: nestedPackageRoots.map((root) => ({
      root,
      name: safeJson(join(root, 'package.json'))?.name ?? basename(root),
    })),
    sourceDirectory: firstExisting(packageRoot, ['src', 'app', 'server', 'packages', 'apps']),
  },
  stack: { frameworks, api, validation, data, auth, queues, testing, logging, telemetry },
  scripts: pkg.scripts ?? {},
  environmentTemplates: envFiles,
  deploymentFiles: deployFiles,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

function list(value) { return value?.length ? value.join(', ') : 'not detected'; }
console.log(`# Node.js project inspection\n`);
console.log(`- Project root: ${result.projectRoot}`);
if (result.root !== result.projectRoot) console.log(`- Package root: ${result.root}`);
console.log(`- Package: ${result.package.name}${result.package.version ? `@${result.package.version}` : ''}`);
console.log(`- Package manager: ${result.runtime.packageManager ?? 'not declared'}${lockfile ? ` (${lockfile})` : ''}`);
console.log(`- Node engines: ${result.runtime.engines ? JSON.stringify(result.runtime.engines) : 'not declared'}`);
console.log(`- Module type: ${result.runtime.moduleType}`);
console.log(`- TypeScript: ${result.runtime.typescript ? `yes${tsconfig ? ` (${tsconfig})` : ''}` : 'no'}`);
console.log(`- Workspaces: ${list(result.architecture.workspaces)}`);
if (result.architecture.workspacePackages.length) {
  console.log(`- Workspace packages: ${result.architecture.workspacePackages.map(({ name }) => name).join(', ')}`);
}
console.log(`- Frameworks: ${list(frameworks)}`);
console.log(`- API libraries: ${list(api)}`);
console.log(`- Validation: ${list(validation)}`);
console.log(`- Data: ${list(data)}`);
console.log(`- Auth/crypto: ${list(auth)}`);
console.log(`- Queues/messaging: ${list(queues)}`);
console.log(`- Testing: ${list(testing)}`);
console.log(`- Logging: ${list(logging)}`);
console.log(`- Telemetry: ${list(telemetry)}`);
console.log(`- Environment templates: ${list(envFiles)}`);
console.log(`- Deployment files: ${list(deployFiles)}`);
console.log(`- Scripts: ${Object.keys(result.scripts).length ? Object.keys(result.scripts).join(', ') : 'none'}`);
