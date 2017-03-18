'use strict';
var http                = require('https')
const aws               = require('aws-sdk')
const s3                = new aws.S3({ apiVersion: '2006-03-01' })
var api_hostname        = 'nebula-native.herokuapp.com'
var transcribe_endpoint = '/dostuff'
var doc_client          = new aws.DynamoDB.DocumentClient()
var watson              = require('watson-developer-cloud');
var fs                  = require('fs');
var streamBuffers       = require('stream-buffers')
var SpeechToTextV1      = require('watson-developer-cloud/speech-to-text/v1');

function get_url(key, bucket) {
    return "https://s3-us-west-2.amazonaws.com/" + bucket + "/" + key
}

function timestamp() {
    return new Date() - 1 }

function save_to_dynamodb(key, bucket, text, success, fail) {
    console.log("saving now");
    doc_client.put(
        {TableName:  'TranscribedNotes',
        Item:       {audio_url:         get_url(key, bucket),
                    transcribed_text:   text}},
        (err, data) => {
            console.log("doc result", err, data)
            if (err)
                fail()
            else
                success(data) })}

function transcribe_stream(stream, next, fail) {
    console.log("doing transcribe")
    var speech_to_text = new SpeechToTextV1({
        username: '03562a4c-5831-44fc-9b2e-4b0ebc922427',
        password: 'LekiqfQ6S13L'});

    var params = {
        audio: stream,
        content_type: 'audio/wav'
    };

    speech_to_text.recognize(params, function(err, res) {
        if (err) {
            console.log(err);
            fail(err) }
        else {
            console.log(JSON.stringify(res, null, 2));
            next(res.results[0].alternatives[0].transcript)  }

    }); }

//transcribe_stream(fs.createReadStream('../sir.wav'))

exports.handler = (event, context, callback) => {
    const bucket        = event.Records[0].s3.bucket.name;
    const key           = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params        = {Bucket:  bucket,
                           Key:    key}
    var transcribed     = ""
    /*
    var payload = JSON.stringify(
        {url:       get_url(key, bucket),
        metadata:   {}})
      
    var request = http.request(
        {host:      api_hostname,
        port:       443,
        path:       transcribe_endpoint,
        method:     'POST',
        headers:    {'Content-Type':    "application/json",
                    'Content-Length':   payload.length}}, 
        function (res) {
            var body = '';
            
            console.log('got res', body)
            res.on('data', function(chnk) { body += chnk})
            res.on('end', function() {

            })
            res.on('error', (e) => context.fail('error', e.message))});
 
*/
    

/*    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
//            var myReadableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
//                frequency: 10,       // in milliseconds.
//                chunkSize: 2048     // in bytes.
//            }); 
  
//            myReadableStreamBuffer.put(data.Body);
*/
    var stream = s3.getObject(params).createReadStream()
    console.log("transcribing", key, bucket, stream)
    transcribe_stream(stream, 
                      (result) => {
                          save_to_dynamodb(key, bucket, result, context.done, context.fail)},
                      (e) => context.fail('error', e.message)) }
