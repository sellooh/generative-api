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

  // create express state machine
  const expressStateMachine = new StateMachine(stack, 'generative-state-machine', {
    stateMachineName: id + '-generative-state-machine',
    comment: 'Generative State Machine',
    definitionBody: FileDefinitionBody.fromFile('stacks/generative-state-machine.json'),
    stateMachineType: StateMachineType.EXPRESS,
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
              .custom('Input', '"GET list /campaigns"')
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
              .custom('Input', '"GET one /campaigns/uuid"')
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
