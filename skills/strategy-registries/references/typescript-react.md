# TypeScript and React Implementation

Read this reference only when the target project uses TypeScript or React.

## Contents

- [Use an exhaustive provider registry](#use-an-exhaustive-provider-registry)
- [Type operation dispatchers per key](#type-operation-dispatchers-per-key)
- [Resolve external keys deliberately](#resolve-external-keys-deliberately)
- [Inject dependencies through narrow contexts](#inject-dependencies-through-narrow-contexts)
- [Share capability descriptors across React layers](#share-capability-descriptors-across-react-layers)
- [Follow project conventions](#follow-project-conventions)

## Use an exhaustive provider registry

Use `Record<Enum, Contract>` when the application owns a closed variant set:

```typescript
enum PaymentProvider {
  Card = 'card',
  Wallet = 'wallet',
}

interface IPaymentProviderStrategy {
  charge: (context: IChargeContext) => Promise<IChargeResult>;
  refund: (context: IRefundContext) => Promise<IRefundResult>;
}

export const paymentProviders: Record<PaymentProvider, IPaymentProviderStrategy> = {
  [PaymentProvider.Card]: cardPaymentProvider,
  [PaymentProvider.Wallet]: walletPaymentProvider,
};
```

This makes a missing entry a compile-time error when the enum grows.

## Type operation dispatchers per key

Do not create one union-shaped context when operations need different inputs. Preserve the exact signature for each literal key:

```typescript
enum PaymentOperation {
  Charge = 'charge',
  Refund = 'refund',
}

interface IPaymentOperationRegistry {
  [PaymentOperation.Charge]: (context: IChargeContext) => Promise<void>;
  [PaymentOperation.Refund]: (context: IRefundContext) => Promise<void>;
}

export const paymentOperations: IPaymentOperationRegistry = {
  [PaymentOperation.Charge]: chargeStrategy,
  [PaymentOperation.Refund]: refundStrategy,
};

await paymentOperations[PaymentOperation.Charge](chargeContext);
```

Use a uniform `Record<Key, Handler>` only when every handler genuinely accepts the same context.

## Resolve external keys deliberately

Use an explicit resolver when a key comes from a server, URL, tenant configuration, or third-party system:

```typescript
const regionPolicies: Record<string, IRegionPolicy> = {
  eu: euRegionPolicy,
  uk: ukRegionPolicy,
};

export const getRegionPolicy = (key: string): IRegionPolicy => {
  const policy = regionPolicies[key];

  if (!policy) {
    throw new UnsupportedRegionError(key);
  }

  return policy;
};
```

When the domain has legitimate neutral behavior, use a named default instead:

```typescript
const defaultRegionPolicy: IRegionPolicy = {
  buildExtraParameters: async () => ({}),
  isBlocked: () => false,
  getBlockedReason: () => '',
};

export const getRegionPolicy = (key: string): IRegionPolicy =>
  regionPolicies[key] ?? defaultRegionPolicy;
```

Do not use this fallback for unknown authentication, signing, payment, permission, or destructive-operation providers.

## Inject dependencies through narrow contexts

Keep React hooks and store selection in components or custom hooks. Build a narrow context before invoking the strategy:

```typescript
const buildChargeContext = (values: IChargeForm): IChargeContext => ({
  paymentClient,
  onSuccess,
  orderId,
  values,
});

const handleSubmit = async (): Promise<void> => {
  const strategy = paymentProviders[selectedProvider];
  await strategy.charge(buildChargeContext(getValues()));
};
```

Do not call `useContext`, `useSelector`, or other hooks inside a module-level strategy entry.

## Share capability descriptors across React layers

Use one descriptor when rendering, validation, and effects vary by the same provider:

```typescript
interface IProviderCapabilities {
  requiresCredentialFile: boolean;
  requiresLogin: boolean;
  prefillLogin: boolean;
}

const providerCapabilities: Record<PaymentProvider, IProviderCapabilities> = {
  [PaymentProvider.Card]: {
    requiresCredentialFile: true,
    requiresLogin: false,
    prefillLogin: false,
  },
  [PaymentProvider.Wallet]: {
    requiresCredentialFile: false,
    requiresLogin: true,
    prefillLogin: true,
  },
};
```

Place the descriptor in the lowest shared layer that all consumers can import without creating an upward dependency.

## Follow project conventions

- Export registries through the project's normal public-module mechanism; do not impose barrel exports on projects that avoid them.
- Use the project's dependency-injection, error, and testing conventions.
- Test entries as plain functions where possible. Test React wiring separately from strategy behavior.
- Keep capability-driven rendering declarative. Use the toolkit's `data-driven-rendering` skill when only props or markup vary.
