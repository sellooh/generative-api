import { StackContext, Api } from "sst/constructs";
import { HttpIntegrationSubtype, ParameterMapping } from '@aws-cdk/aws-apigatewayv2-alpha';
import { RemovalPolicy } from 'aws-cdk-lib';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { FileDefinitionBody, LogLevel, StateMachine, StateMachineType } from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';

export function API({ app, stack }: StackContext) {
  const id = stack.stackName;

  const expressLogGroup = new LogGroup(stack, 'generative-state-machine-logs', {
    retention: RetentionDays.ONE_DAY,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const prompt = `You are an API that handles campaigns.
Based on the input received, provide an appropriate response a Restful API would give.
Return always a valid JSON and no extra information!
Required attributes [uuid, name, startDate, endDate, isActive].
Allowed methods: [POST, GET].
Allowed paths: [/campaigns, /campaigns/uuid].
The user input is: `.replace(/\n/g, " ");

  // const model = 'ai21.j2-mid-v1';
  const model = 'ai21.j2-ultra-v1';

  // create express state machine
  const expressStateMachine = new StateMachine(stack, 'generative-state-machine', {
    stateMachineName: id + '-generative-state-machine',
    definitionBody: FileDefinitionBody.fromFile('stacks/generative-state-machine.json'),
    stateMachineType: StateMachineType.EXPRESS,
    definitionSubstitutions: {
      prompt,
      model,
    },
    logs: {
      destination: expressLogGroup,
      level: LogLevel.ALL,
      includeExecutionData: true,
    }
  });

  // Allow state machine to invoke bedrock
  expressStateMachine.addToRolePolicy(new iam.PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: ['*'],
  }));

  const api = new Api(stack, "api", {
    routes: {
      'GET /campaigns': {
        type: 'aws',
        cdk: {
          integration: {
            subtype: HttpIntegrationSubtype.STEPFUNCTIONS_START_SYNC_EXECUTION,
            parameterMapping: new ParameterMapping()
              .custom('StateMachineArn', expressStateMachine.stateMachineArn)
              .custom('Input', '"list two items GET /campaigns"')
          }
        }
      },
      'GET /campaigns/{uuid}': {
        type: 'aws',
        cdk: {
          integration: {
            subtype: HttpIntegrationSubtype.STEPFUNCTIONS_START_SYNC_EXECUTION,
            parameterMapping: new ParameterMapping()
              .custom('StateMachineArn', expressStateMachine.stateMachineArn)
              .custom('Input', '"find one item GET /campaigns/123e4567-e89b-12d3-a456-426614174000"')
          }
        }
      },
      'POST /campaigns': {
        type: 'aws',
        cdk: {
          integration: {
            subtype: HttpIntegrationSubtype.STEPFUNCTIONS_START_SYNC_EXECUTION,
            parameterMapping: new ParameterMapping()
              .custom('StateMachineArn', expressStateMachine.stateMachineArn)
              .custom('Input', '$request.body')
          }
        }
      }
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
