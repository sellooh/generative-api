# Generative API

An example of API that leverages AWS Bedrock to fake a backend

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js and npm installed
- AWS account

### Installing

1. Clone the repository
```sh
git clone https://github.com/sellooh/generative-api
```
2. Install dependencies
```sh
pnpm install
```

3. Run locally
```sh
npx sst dev
```

## Usage

The project includes several API endpoints defined in [MyStack.ts](stacks/MyStack.ts). 

- `GET /campaigns`: List all campaigns
- `GET /campaigns/{uuid}`: Get a specific campaign by its UUID
- `POST /campaigns`: Create a new campaign

To deploy the stack, run:

```sh
npx sst deploy
```

## Built With

- [Serverless Stack (SST)](https://docs.sst.dev/)
- [AWS CDK](https://aws.amazon.com/cdk/)
- [TypeScript](https://www.typescriptlang.org/)
