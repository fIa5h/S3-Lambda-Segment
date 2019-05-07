
# S3-Lambda-Segment  
### A walkthrough, with source code, that enables you to upload a CSV file containing Segment data to S3 that is automatically parsed, formatted and uploaded to Segment.
---
Segment customers may have sources of data where Segment’s SDKs cannot be instrumented, including other SaaS tools for which Segment does not have a readily available turn-key connector. In many of these cases, you may extract data from these sources in the form of CSV files, and then leverage our server-side SDKs or HTTP tracking api to push the records into Segment.  

The goal of this project is to make this process easier by providing an automated process that ingests this data. Upon completing this tutorial, you will have the following Amazon S3, Lambda, and IAM resources in your AWS account:

#### Lambda Resources

- A Lambda function.

- An access policy associated with your Lambda function that grants Amazon S3 permission to invoke the Lambda function.

#### IAM Resources

- An execution role that grants permissions that your Lambda function needs through the permissions policy associated with this role.

#### Amazon S3 Resources

- A source bucket with a notification configuration that invokes the Lambda function.
- --
### Prerequisites
This tutorial assumes that you have some knowledge of basic Lambda operations and the Lambda console. If you haven't already, follow the instructions in  [Getting Started with AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html)  to create your first Lambda function.

To follow the procedures in this guide, you will need a command line terminal or shell to run commands. Commands are shown in listings preceded by a prompt symbol ($) and the name of the current directory, when appropriate.

On Linux and macOS, use your preferred shell and package manager. On Windows 10, you can  [install the Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10)  to get a Windows-integrated version of Ubuntu and Bash.

Install NPM to manage the function's dependencies.

## Getting Started
### Create the Execution Role

Create the  [execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)  that gives your function permission to access AWS resources.

**To create an execution role**

1.  Open the  [roles page](https://console.aws.amazon.com/iam/home#/roles)  in the IAM console.
    
2.  Choose  **Create role**.
    
3.  Create a role with the following properties.
    
    -   **Trusted entity**  –  **AWS Lambda**.
        
    -   **Permissions**  –  **AWSLambdaExecute**.
        
    -   **Role name**  –  **`lambda-s3-role`**.
        

The  **AWSLambdaExecute**  policy has the permissions that the function needs to manage objects in Amazon S3 and write logs to CloudWatch Logs.
### Create Buckets and Upload a Sample Object

Follow the steps to create buckets and upload an object.

1.  Open the Amazon S3 console.
    
2.  Create your bucket. Consider using the name `S3-Lambda-Segment` - we will use this name throughout the tutorial to refer to our function.
    
3.  In the source bucket, upload a dummy .csv object,  `track_1.csv`. You can find a sample `track_1.csv` file in this repository.
    
    When you invoke the Lambda function manually before you connect to Amazon S3, you pass sample event data to the function that specifies the source bucket and  `track_1.csv`  as the newly created object so you need to create this sample object first. You can find a sample `track_1.csv` included in this repository.

### Create the Function

The code in `index.js` receives an Amazon S3 event input and processes the message that it contains. It grabs the newly uploaded .csv in the source bucket, transforms the data, then uploads it to Segment.

Note: For sample code in other languages, see  [Sample Amazon Simple Storage Service Function Code](https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example-deployment-pkg.html).

Review the `index.js` code in this repository and note the following:

-   The function knows the source bucket name and the key name (uploaded file name) of the object from the event data it receives as parameters.
- The `csvtojson` npm package does some heavy lifting for us when parsing and reformatting CSV to JSON. 
- The Segment Object API accepts a different format than the other APIs.
    
The deployment package is a .zip file containing your Lambda function code and dependencies.

**To create a deployment package**
-   Clone this repository to your local machine - the repository contains a pre-zipped deployment package.

	`git clone https://github.com/RyanThomasMusser/S3-Lambda-Segment.git`

-   Install all dependencies
    
    ```
    yarn init
    ```
    or if you are using npm
    ```
    npm install
    ```

-   Build the zip bundle that you will upload into AWS Lambda?
    ```
    yarn build
    ```
    or if you are using npm
    ```
    npm run build
    ```

**To create the function**

-   Create a Lambda function with the  `create-function`  command.
    
    `S3-Lambda-Segment$ aws lambda create-function --function-name S3-Lambda-Segment --zip-file fileb://function.zip --handler index.handler --runtime nodejs8.10 --timeout 30 --memory-size 1024 --role arn:aws:iam::`**`<YOUR IAM ROLE ID>`**`:role/lambda-s3-role`
    

The preceding command specifies a 30-second timeout value as the function configuration. Depending on the size of objects you upload, you might need to increase the timeout value using the following AWS CLI command.

``S3-Lambda-Segment$ aws lambda update-function-configuration --function-name S3-Lambda-Segment --timeout 60``

### Test the Lambda Function

In this step, you invoke the Lambda function manually using sample Amazon S3 event data.

**To test the Lambda function**

1.  This is where we'll use our previously created  `track_1.csv` file. You need to update the JSON by providing your  _`sourcebucket`_  name and `awsRegion`.
    
    ``S3-Lambda-Segment$ aws lambda invoke --function-name S3-Lambda-Segment --invocation-type Event --payload '{"Records":[ { "eventVersion":"2.0", "eventSource":"aws:s3", "awsRegion":"``**`<YOUR REGION, FOR EXAMPLE: us-east-1>`**``", "eventTime":"1970-01-01T00:00:00.000Z", "eventName":"ObjectCreated:Put", "userIdentity":{ "principalId":"AIDAJDPLRKLG7UEXAMPLE" }, "requestParameters":{ "sourceIPAddress":"127.0.0.1" }, "responseElements":{ "x-amz-request-id":"C3D13FE58DE4C810", "x-amz-id-2":"FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD" }, "s3":{ "s3SchemaVersion":"1.0", "configurationId":"testConfigRule", "bucket":{ "name":"``**`<YOUR BUCKET NAME>"`**``, "ownerIdentity":{ "principalId":"A3NL1KOZZKExample" }, "arn":"arn:aws:s3:::``**`<YOUR BUCKET NAME>`**``" }, "object":{ "key":"track_1.csv", "eTag":"d41d8cd98f00b204e9800998ecf8427e", "versionId":"096fKKXTRTtl3on89fVO.nfljtsv6qko" } } } ] }'``  
2.  Run the previous command to invoke the function. Note that the command requests asynchronous execution. You can optionally invoke it synchronously by specifying  `RequestResponse`  as the  `invocation-type`  parameter value.
    
3.  Verify execution in your Cloudwatch logs.

### Configure Amazon S3 to Publish Events

In this step, you add the remaining configuration so that Amazon S3 can publish object-created events to AWS Lambda and invoke your Lambda function. You do the following in this step:

-   Add permissions to the Lambda function access policy to allow Amazon S3 to invoke the function.
    
-   Add notification configuration to your source bucket. In the notification configuration, you provide the following:
    
    -   Event type for which you want Amazon S3 to publish events. For this tutorial, you specify the`s3:ObjectCreated:*`  event type so that Amazon S3 publishes events when objects are created.
        
    -   Lambda function to invoke.
        
    

**To add permissions to the function policy**

1.  Run the following Lambda CLI  `add-permission`  command to grant Amazon S3 service principal (`s3.amazonaws.com`) permissions to perform the  `lambda:InvokeFunction`  action. Note that permission is granted to Amazon S3 to invoke the function only if the following conditions are met:
    
    -   An object-created event is detected on a specific bucket.
        
    -   The bucket is owned by a specific AWS account. If a bucket owner deletes a bucket, some other AWS account can create a bucket with the same name. This condition ensures that only a specific AWS account can invoke your Lambda function.
        
    
    ``S3-Lambda-Segment$ aws lambda add-permission --function-name S3-Lambda-Segment --principal s3.amazonaws.com --statement-id _some-unique-id_ --action "lambda:InvokeFunction" --source-arn arn:aws:s3:::``**`<YOUR BUCKET NAME>`**`` --source-account ``**`<BUCKET OWNER ACCOUNT ID>`**
    
2.  Verify the function's access policy by running the AWS CLI  `get-policy`  command.
    
    ```S3-Lambda-Segment$ aws lambda get-policy --function-name S3-Lambda-Segment```
    
Add notification configuration on the source bucket to request Amazon S3 to publish object-created events to Lambda.

**To configure notifications**

1.  Open the  [Amazon S3 console](https://console.aws.amazon.com/s3).
    
2.  Choose the source bucket.
    
3.  Choose  **Properties**.
    
4.  Under  **Events**, configure a notification with the following settings.
    
    -   **Name**  –  **`lambda-trigger`**.
        
    -   **Events**  –  **`ObjectCreate (All)`**.
        
    -   **Send to**  –  **`Lambda function`**.
        
    -   **Lambda**  –  **`S3-Lambda-Segment`**.
        
    

For more information on event configuration, see  [Enabling Event Notifications](https://docs.aws.amazon.com/AmazonS3/latest/user-guide/enable-event-notifications.html)  in the  _Amazon Simple Storage Service Console User Guide_.

## Test the Setup

Now you can test the setup as follows:

1.  Upload a properly formatted .csv file to the source bucket.
    
2.  Verify that the data was uploaded to Segment using the Segment debugging console.
    
3.  View logs in the CloudWatch console.
