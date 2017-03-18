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

function update_to_db(id, data, success, fail) {
    doc_client.get(
        {TableName:  "TranscribedNotes",
         Key:        {audio_url: id}},
        (err, orig_data) => {
            if (err) console.log("error pulling by id", id, err)

            data = Object.assign((orig_data || {Item: {}}).Item,
                                 {audio_url: id},
                                 data)
            doc_client.put(
                {TableName:  'TranscribedNotes',
                 Item:        data},
                (err, response) => {
                    if (err)    fail()
                    else        success(response) })})}
                    
function save_to_dynamodb(key, bucket, transcribed_text, success, fail) {
    console.log("saving now");
    update_to_db(get_url(key, bucket),
                 {transcribed_text},
                 success, fail)}

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

exports.handler = (event, context, callback) => {
    const bucket        = event.Records[0].s3.bucket.name;
    const key           = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params        = {Bucket:  bucket,
                           Key:    key}
    var transcribed     = ""

    var stream = s3.getObject(params).createReadStream()
    console.log("transcribing", key, bucket, stream)
    transcribe_stream(stream, 
                      (result) => {
                          save_to_dynamodb(key, bucket, result, context.done, context.fail)},
                      (e) => context.fail('error', e.message)) }
