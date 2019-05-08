const program = require('commander');
const exec = require('child_process').exec;

program
  .option('--lambdaUpload', 'lambdaUpload')
  .option('--lambdaTest', 'lambdaTest')
  .option('--lambdaPermissionsSet', 'lambdaPermissionsSet')
  .option('--lambdaPermissionsView', 'lambdaPermissionsView')
  .option('--roleId [int]', 'roleId')
  .option('--lambdaName [string]', 'lambdaName')
  .option('--region [string]', 'region')
  .option('--bucketName [string]', 'bucketName')
  .option('--bucketOwnerAccountId [int]', 'bucketOwnerAccountId')
  .option('--segmentWriteKey [string]', 'segmentWriteKey');

program.parse(process.argv);

if (program.lambdaUpload){
  if(!program.lambdaName || !program.roleId || !program.segmentWriteKey){
    console.error('Error! Please include --lambdaName, --segmentWriteKey and --roleId');
  }else{
    exec(`S3-Lambda-Segment$ aws lambda create-function --function-name `+program.lambdaName+` --zip-file fileb://function.zip --handler index.handler --runtime nodejs8.10 --timeout 60 --memory-size 1024 --role arn:aws:iam::`+program.roleId+`:role/lambda-s3-role `+`--environment Variables={write_key=`+program.segmentWriteKey+`}`, function (error, stdOut, stdErr) {
      if(error) console.log(error);
      if(stdOut) console.log(stdOut);
      if(stdErr) console.log(stdErr);
    });
  }
}else if(program.lambdaTest){
  // Let's send a fake event to our Lambda function to invoke it
  if(!program.lambdaName || !program.region || !program.bucketName){
    console.error('Error! Please include --lambdaName, --region and --bucketName');
  }else{
    exec(`aws lambda invoke --function-name `+program.lambdaName+` --invocation-type Event --payload '{"Records":[ { "eventVersion":"2.0", "eventSource":"aws:s3", "awsRegion":"`+program.region+`", "eventTime":"1970-01-01T00:00:00.000Z", "eventName":"ObjectCreated:Put", "userIdentity":{ "principalId":"AIDAJDPLRKLG7UEXAMPLE" }, "requestParameters":{ "sourceIPAddress":"127.0.0.1" }, "responseElements":{ "x-amz-request-id":"C3D13FE58DE4C810", "x-amz-id-2":"FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD" }, "s3":{ "s3SchemaVersion":"1.0", "configurationId":"testConfigRule", "bucket":{ "name":"`+program.bucketName+`", "ownerIdentity":{ "principalId":"A3NL1KOZZKExample" }, "arn":"arn:aws:s3:::`+program.bucketName+`" }, "object":{ "key":"track_1.csv", "eTag":"d41d8cd98f00b204e9800998ecf8427e", "versionId":"096fKKXTRTtl3on89fVO.nfljtsv6qko" } } } ] }'`, function (error, stdOut, stdErr) {
      if(error) console.log(error);
      if(stdOut) console.log(stdOut);
      if(stdErr) console.log(stdErr);
    });
  }
  // /Let's send a fake event to our Lambda function to invoke it
}else if(program.lambdaPermissionsSet){
  // Let's set the permissions of the Lambda
  if(!program.lambdaName || !program.bucketOwnerAccountId || !program.bucketName){
    console.error('Error! Please include --lambdaName, --bucketOwnerAccountId and --bucketName');
  }else{
    exec('aws lambda add-permission --function-name '+program.lambdaName+' --principal s3.amazonaws.com --statement-id _some-unique-id_ --action "lambda:InvokeFunction" --source-arn arn:aws:s3:::'+program.bucketName+' --source-account '+program.bucketOwnerAccountId, function (error, stdOut, stdErr) {
      if(error) console.log(error);
      if(stdOut) console.log(stdOut);
      if(stdErr) console.log(stdErr);
    });
  }
  // /Let's set the permissions of the Lambda
}else if(program.lambdaPermissionsView){
  // Let's check the permissions of the Lambda function
  if(!program.lambdaName){
    console.error('Error! Please include --lambdaName');
  }else{
    exec('aws lambda get-policy --function-name '+program.lambdaName, function (error, stdOut, stdErr) {
      if(error) console.log(error);
      if(stdOut) console.log(stdOut);
      if(stdErr) console.log(stdErr);
    });
  }
  // /Let's check the permissions of the Lambda function
}else{
  console.log("Please pass a valid argument...");
}
