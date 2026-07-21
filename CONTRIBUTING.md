# Contribute to Forge

You can submit bug reports and small pull requests.

Open an issue before you make a large change. Do not include credentials, private design data, or third-party material that you cannot distribute.

## Local checks

Use Node.js 22 or a newer version. Run these commands:

```bash
npm ci
npm run typecheck
npm run build
```

All commands must complete without an error.

## Model providers

Keep provider code separate from the Forge response protocol. A new provider must return the same response channels.

Do not put an API key in source code, tests, examples, logs, or screenshots.

## Documentation style

Use ASD-STE100 Simplified Technical English principles.

- Use short sentences.
- Give one instruction in each step.
- Use active voice.
- Use the same term for the same item.
- Use American English spelling.
- Keep model IDs and code identifiers unchanged.
