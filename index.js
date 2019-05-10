// dependencies
var async = require('async');
var AWS = require('aws-sdk');
// csvtojson quickly and easily parses and formats our CSV files
var csv = require('csvtojson');
// the following are Segment libraries
var Analytics = require('analytics-node');
var Objects = require('objects-node');

var analytics = new Analytics(process.env.write_key);
var objects = new Objects(process.env.write_key);
var s3 = new AWS.S3();


exports.handler = function(event, context, callback) {
    // Read options from the event.
    //console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    // File name may have spaces or unicode non-ASCII characters.
    var srcFileName    =
    decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    // Download the CSV from S3, transform, and upload to Segment.
    // More on async.waterfall here: https://caolan.github.io/async/docs.html#waterfall
    async.waterfall([
        function download(next) {
            // Download the CSV from S3 into a buffer.
            //console.log("download");
            s3.getObject({
                    Bucket: srcBucket,
                    Key: srcFileName
                },
                next);
        },
        function transform(response, next) {
            //console.log("transform");
            var csvString = response.Body.toString();
            // In colParser we ensure that our timestamps aren't strings, Segment APIs don't like strings here
            csv({
            	colParser:{
            		"createdAt":function(item){return new Date(item);},
                "timestamp":function(item){return new Date(item);},
            	}
            })
            .fromString(csvString)
            .then((formattedResults)=>{
              next(null,formattedResults);
            })
        },
        function upload(formattedResults, next) {
            //console.log("upload");
            //console.log(formattedResults);
            if(srcFileName.startsWith('identify_')){
              formattedResults.map(function(identifyObject){
                // More in the docs here: https://segment.com/docs/spec/identify/
                analytics.identify(identifyObject);
              });
            }else if(srcFileName.startsWith('track_')){
              formattedResults.map(function(trackObject){
                // More in the docs here: https://segment.com/docs/spec/track/
                analytics.track(trackObject);
              });
            }else if(srcFileName.startsWith('page_')){
              formattedResults.map(function(pageObject){
                // More in the docs here: https://segment.com/docs/spec/page/
                analytics.page(pageObject);
              });
            }else if(srcFileName.startsWith('screen_')){
              formattedResults.map(function(screenObject){
                // More in the docs here: https://segment.com/docs/spec/screen/
                analytics.screen(screenObject);
              });
            }else if(srcFileName.startsWith('group_')){
              formattedResults.map(function(groupObject){
                // More in the docs here: https://segment.com/docs/spec/group/
                analytics.group(groupObject);
              });
            }else if(srcFileName.startsWith('alias_')){
              formattedResults.map(function(aliasObject){
                // More in the docs here: https://segment.com/docs/spec/alias/
                analytics.alias(aliasObject);
              });
            }else if(srcFileName.startsWith('object_')){
              // Ughh I hate having a variable named objectObject :(
              formattedResults.map(function(objectObject){
                // The Object API accepts a different format than the other APIs
                // More in the docs here: https://github.com/segmentio/objects-node
                // First, we get our collection name
                var objectCollection = srcFileName.split("_")[1];
                // Then, we get and delete our objectId from the object we pass into Segment
                var objectId = objectObject.id;
                delete objectObject.id;
                console.log("objectCollection: ",objectCollection);
                console.log("objectId: ", objectId);
                console.log("objectObject: ",objectObject);
                objects.set(objectCollection, objectId, objectObject);
              });
            }else{
              console.log("ERROR! No call type specified! Your CSV file in S3 should start with 'identify_', 'track_', 'page_', 'screen_', 'group_', 'alias_' or 'object_<collection>'");
              throw new Error;
            }

            // Now we make sure that all of our queued actions are flushed before moving on
            if(srcFileName.startsWith('object_')){
              var objectCollection = srcFileName.split("_")[1];
              objects.flush(objectCollection, function(err, batch){
                next(err,"Done");
              });
            }else{
              analytics.flush(function(err, batch){
                next(err,"Done");
              });
            }
        }
      ], function (err) {
            // Some pretty basic error handling
            if (err) {
                console.error(
                    'Unable to download ' + srcBucket + '/' + srcFileName +
                    ' and upload to Segment' +
                    ' due to an error: ' + err
                );
            } else {
                console.log(
                    'Successfully downloaded ' + srcBucket + '/' + srcFileName +
                    ' and uploaded to Segment!'
                );
            }

            callback(null, "Success!");
        }
    );
};
