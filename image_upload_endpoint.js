'use strict';
var http                = require('https')
const aws               = require('aws-sdk')
const s3                = new aws.S3({ apiVersion: '2006-03-01' })
var doc_client          = new aws.DynamoDB.DocumentClient()
var fs                  = require('fs');

function get_url(key, bucket) {
    return "https://s3-us-west-2.amazonaws.com/" + bucket + "/" + key
}

function timestamp() {
    return new Date() - 1 }
                    
function update_to_db(id, data, success, fail) {
    doc_client.get(
        {TableName:  "Notes",
         Key:        {id}},
        (err, orig_data) => {
            if (err) console.log("error pulling by id", id, err)
            if (orig_data) {
                console.log('deleting the data')
                doc_client.delete({TableName:  "Notes",
                                   Key:        {id}}, (err, response) => {
                                       console.log("Deleting response", {err, response})
                                       cont()})}
            else { cont()}
            function cont() {
            console.log('data', orig_data, data, id, JSON.stringify(orig_data))
            data = Object.assign((orig_data || {Item: {}}).Item || {},
                                 {id: id},
                                 data || {})
            console.log('pushing the data', data)
            doc_client.put(
                {TableName:  'Notes',
                 Item:        data},
                (err, response) => {
                    if (err)    fail()
                    else        success(response) })}})}                    
                    
function save_to_dynamodb(key, bucket, image_url, success, fail) {
    update_to_db(Number.parseInt(key),
                 {image_url},
                 success, fail)}

exports.handler = (event, context, callback) => {
    const bucket        = event.Records[0].s3.bucket.name;
    const key           = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params        = {Bucket:  bucket,
                           Key:    key}
  
  save_to_dynamodb(key, bucket, get_url(key, bucket), 
                    context.done, context.fail)}
