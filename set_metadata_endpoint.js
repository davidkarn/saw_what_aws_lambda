var http                = require('https')
const aws               = require('aws-sdk')
const s3                = new aws.S3({ apiVersion: '2006-03-01' })
var api_hostname        = 'nebula-native.herokuapp.com'
var transcribe_endpoint = '/dostuff'
var doc_client          = new aws.DynamoDB.DocumentClient()


function update_to_db(id, data, success, fail) {
    doc_client.get(
        {TableName:  "Notes",
         Key:        {id: id}},
        (err, orig_data) => {
            if (err) console.log("error pulling by id", id, err)
            console.log('data', orig_data, data, id, JSON.stringify(orig_data))
            
            data = Object.assign((orig_data || {Item: {}}).Item || {},
                                 {id: id},
                                 data || {})
                                 console.log("putting data", data)
            for (var i in data) {
                if (data[i] == "" || data[i] == null || data[i] == undefined)
                    delete data[i]
            }
            doc_client.put(
                {TableName:  'Notes',
                 Item:        data},
                (err, response) => {
                    console.log({err, response})
                    if (err)    fail()
                    else        success(response) })})}
                    
function save_to_dynamodb(id, data, success, fail) {
    if (data.id) data.id = Number.parseInt(id)
    update_to_db(Number.parseInt(id),
                 data,
                 success, fail)}

exports.handler = (event, context, callback) => {
    console.log({event})
    event = event
    save_to_dynamodb(event.id, event,
                    () => callback(null, {
                                "statusCode": 200,
                                "headers": { "Content-Type": "text/json", "Content-Length": JSON.stringify(event).length},
                                "body": JSON.stringify(event)}),
                    () => context.fail('failed')); }
