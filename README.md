
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
        

**Please note the newly created IAM role id, we will need it later**! The  **AWSLambdaExecute**  policy has the permissions that the function needs to manage objects in Amazon S3 and write logs to CloudWatch Logs.
### Create Buckets and Upload a Sample Object

Follow the steps to create buckets and upload an object.

1.  Open the Amazon S3 console.
    
2.  Create your bucket. **Please note your bucket name, we will need it later**!
    
3.  In the source bucket, upload a dummy .csv object, `track_1.csv`. You can find a sample `track_1.csv` file in this repository.
    
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

	```
	git clone https://github.com/RyanThomasMusser/S3-Lambda-Segment.git
	```

-   Install dependencies
    ```
    npm install
    ```

**To create the function**

-   Upload the Lambda function using the following:
    
    ```
    $ node quickCommands.js --lambdaUpload --lambdaName <YOUR LAMBDA NAME> --roleId <THE IAM ROLE ID>
    ```
    

**Please note your Lambda function's name and region, we will need them later**. The preceding command sets a 60-second timeout value as the function configuration. Depending on the size of objects you upload, you might need to increase the timeout value using the following AWS CLI command.

```
$ aws lambda update-function-configuration --function-name <YOUR LAMBDA NAME> --timeout 90
```

### Test the Lambda Function

In this step, you invoke the Lambda function manually using sample Amazon S3 event data.

**To test the Lambda function**

1.  The command below use our previously created `track_1.csv` file that we've uploaded to S3 as our data source, simulate that `track_1.csv` was uploaded, and manually trigger our lambda function: 
    
    ```
    $ node quickCommands.js --lambdaTest --lambdaName <YOUR LAMBDA NAME> --region <THE AWS REGION> --bucketName <YOUR S3 BUCKET NAME>
    ```
    
3.  Verify execution in your Cloudwatch logs.

### Configure Amazon S3 to Publish Events

In this step, you add the remaining configuration so that Amazon S3 can publish object-created events to AWS Lambda and invoke your Lambda function. You do the following in this step:

-   Add permissions to the Lambda function access policy to allow Amazon S3 to invoke the function.
    
-   Add notification configuration to your source bucket. In the notification configuration, you provide the following:
    
    -   Event type for which you want Amazon S3 to publish events. For this tutorial, you specify the`s3:ObjectCreated:*`  event type so that Amazon S3 publishes events when objects are created.
        
    -   Lambda function to invoke.
        
    

**To add permissions to the function policy**

1.  Run the following command to grant Amazon S3 service principal (`s3.amazonaws.com`) permissions to perform the  `lambda:InvokeFunction`  action. Note that permission is granted to Amazon S3 to invoke the function only if the following conditions are met:
    
    -   An object-created event is detected on a specific bucket.
        
    -   The bucket is owned by a specific AWS account. If a bucket owner deletes a bucket, some other AWS account can create a bucket with the same name. This condition ensures that only a specific AWS account can invoke your Lambda function.
        
    
    ```
    $ node quickCommands.js --lambdaPermissionsSet --lambdaName <YOUR LAMBDA NAME> --bucketOwnerAccountId <AWS BUCKET OWNER ACCOUNT ID> --bucketName <YOUR S3 BUCKET NAME>
    ```
    
2. Then, you can verify the function's access policy by running the following command:
    
    ```
    node quickCommands.js --lambdaPermissionsView --lambdaName <YOUR LAMBDA NAME>
    ```
    
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

# Things to note
## Timestamps
This script will automatically transform all CSV timestamp columns, regardless of nesting, that have the names `createdAt` and `timestamp` to timestamp objects in preparation for Segment ingestion. If you have your timestamps named differently, please search `index.js` for "colParser" and add your column names there for automatic transformation. You will then have to re-zip the package using `zip -r function.zip .` and upload the newly created zip to Lambda.
## CSV Format 
Based on the method you want to execute, your CSV files should have a defined structure.  

**Identify Structure**

An `identify_XXXXX` csv file will have the following field names:

1. userId - Required
2. anonymousId - Optional
3. traits.<name> - Optional
4. context.ip - Optional
5. context.device.id - Optional
6. timestamp (Unix time) - Optional
7. integrations.<integration> - Optional

In the above structure, the `userId` is a must but the remaining aren’t. Traits would start the name `traits.<name>`.  Context fields will start the name `context.` followed by the canonical structure.  The same canonical structure will apply to `integrations` too.  


**Page/Screen Structure**

For eg: a `screen_XXXXX` or `page_YYYY` file will have the following field names:

1. userId - Required
2. name - Required
3. anonymousId - Optional
4. properties.<name> - Optional
5. context.ip - Optional
6. context.device.id - Optional
7. timestamp (Unix time) - Optional
8. integrations.<integration> - Optional
	
**Track Structure**

For eg: a `track_XXXXX` file will have the following field names:

1. userId - Required
2. event - Required
3. anonymousId - Optional
4. properties.<name> - Optional
5. context.ip - Optional
6. context.device.id - Optional
7. timestamp (Unix time) - Optional
8. integrations.<integration> - Optional

Structure for `track` or `page` is almost identical to `identify` with the exception for where traits will go.  In this case the `traits` will get nested under `context` just like `device` is.  

**Nested structures**

In each of the methods, there will may need to pass nested JSON to the tracking or objects api.  To support the concept of nested in CSVs, we will use the canonical naming convention to specify them.  For eg: `context.device.advertisingId` as a CSV column will eventually look like this in JSON:

``
    "context": { 
      "device": {
        "advertisingId": "like_i_am_going_to_give_that_away"
      }
    }
 ``

**Object Structure**

There will be scenarios in which our tracking API will not be suitable for datasets that a customer would like to move to a warehouse connected to their Segment workspace.  This can be e-commerce product data, media content metadata, campaign performance etc.  

To accomplish this we will need to rely on our Objects API which today is used in all our object cloud sources. There is library support for this api with Node and Go-lang.

**Filename**

CSV files that should be treated as Segment objects should start the filename with `object_<collection>_` where collection is the name of the object.  For eg:

``
    segment.set('rooms', '2561341', {
      name: 'Charming Beach Room Facing Ocean',
      location: 'Lihue, HI',
      review_count: 47
    });
``

In the above, the CSV filename would start with `object_rooms_` where rooms is the name of the collection in question.  

CSV structure will look the following:


1. id - Required
