#!/bin/bash
zip -r index.zip index/* && aws lambda update-function-code --function-name=whatever --zip-file fileb://`pwd`/index.zip 
