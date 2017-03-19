from __future__ import print_function
import boto3
import json
import uuid
from decimal import Decimal
from datetime import datetime
from datetime import timedelta
import random
import urlparse
table_name = 'Notes'
bucket_name = 'saywhat2'
s3_url = 'https://s3.amazonaws.com/{}'.format(bucket_name)
print('Loading function')
audio = ('Lorem Ipsum is simply dummy text of the printing and typesetting industry. '
    'Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, '
    'when an unknown printer took a galley of type and scrambled it to make a type specimen book. '
    'It has survived not only five centuries, but also the leap into electronic typesetting, '
    'remaining essentially unchanged. It was popularised in the 1960s with the release of '
    'Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing '
    'software like Aldus PageMaker including versions of Lorem Ipsum').replace(',', ' ').split()
usernames = ['jason', 'brey', 'datboi', 'marc', 'gavin', 'urmom', 'urmom']
type_of_user = ['coordinates',
 'design',
 'contractor',
 'owner',
 'surgeon',
 'nurse',
 'coordinates']
 
headers=[
 'GUID',
 'x',
 'y',
 'z',
 'spherical image',
 'audio',
 'audio transcription',
 'username',
 'design discipline affected',
 'type of user',
 'estimated cost of change',
 'estimated time of design change',
 'level of impact']

headers_keys=[
 'GUID',
 'x',
 'y',
 'z',
 'image_url',
 'audio_url',
 'transcribed_text',
 'username',
 'design discipline affected',
 'type of user',
 'estimated cost of change',
 'estimated time of design change',
 'level of impact']
COL_INTS = set(['estimated cost of change', 'estimated time of design change', 'level of impact']) 
COL_FLOATS = set(['x', 'y', 'z'])
 
def respond(err, res=None):
    return {
        'statusCode': '400' if err else '200',
        'body': err.message if err else json.dumps(res),
        'headers': {
            'Content-Type': 'application/json',
        },
    }
    
def csv_respond(err, data=None):
    ret=['"%s"'%('","'.join(headers)), ]
    ret.extend([','.join(map(str, _)) for _ in data])
    return {
        'statusCode': '400' if err else '200',
        'body': err.message if err else '\r\n'.join(ret) + '\r\n',
        'headers': {
            'Content-Type': 'text/jsv',
        },
    }
def make_db_entry(payload, names):
    print('incoming data', payload)
    ret = dict()
    for name in names:
        ret[name.lower()] = Decimal(str(payload[name][0]))
    ret['id'] = Decimal(str(payload['id'][0]))
    return ret
    
def random_price():
    return '$'+ '{:20.2f}'.format(random.uniform(50,5000)).strip()
    
def dummy_val(name):
    if (name == "username"):
        return random.choice(usernames)
    elif (name == "spherical image"):
        return 'http://sphcst.com/%s' % (pay2['id'], )
    elif (name == 'type of user'):
        return random.choice(type_of_user)
    elif (name == 'timestamp'):
        return datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')
    elif (name == 'estimated cost of change'):
        return random_price()
    elif (name == 'estimated time of design change'):
        return (datetime.now() + timedelta(seconds=random.randint(200,200000))).strftime('%Y-%m-%d %I:%M:%S %p')
    else:
        return random.randint(0, 5)
    
def lambda_handler(event, context):
    print('event', event)
    print('context', context)
    dynamo = boto3.resource('dynamodb').Table(table_name)
    operation = event['httpMethod']
    
    if operation == 'POST':
        payload = urlparse.parse_qs(event['body'])
        pay2 = make_db_entry(payload, ('X', 'Y', 'Z'))
        for key in headers[4:-3]:
            pay2[key] = uuid.uuid4().hex
        for key in headers[-3:]:
            pay2[key] = random.randint(0,5)
        pay2['username'] = random.choice(usernames)
        words = ' '.join([random.choice(audio) for _ in range(random.randint(3,5))])
        #pay2['audio transcription'] = words
        pay2['spherical image'] = 'http://sphcst.com/%s' % (pay2['id'], )
        #pay2['audio'] = 'https://s3.amazonaws.com/%s/%s.wav' % (bucket_name, pay2['id'])
        pay2['type of user'] = random.choice(type_of_user)
        pay2['timestamp'] = datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')
        return respond(None, dynamo.put_item(Item=pay2))
    elif operation == 'GET':
        ret = []
        # need to convert the odd "Decimal" type into a decimal
        # this is going to return CSV
        for item in dynamo.scan()['Items']:
            def g(name):
                return float(item.get(name, 0))
            q = [item['id'],g('x'),g('y'),g('z'),]
            for _ in headers_keys[4:]:
                if item.get(_, 0):
                    q.append(item.get(_, 0))
                else:
                    q.append(dummy_val(_))
            #q.extend([item.get(_, '') for _ in headers_keys[4:]])
            # item 6 are words that could have a comma
            q[6] = '"%s"' % (q[6], )
            # convert the tuple into a CSV string
            ret.append(q)
        return csv_respond(None, ret)
    elif operation == 'PUT':
        payload = urlparse.parse_qs(event['body'])
        guid = str(payload['guid'][0])
        pay2 = dict()
        if 'username' in payload:
            pay2['username'] = dict(Value=str(payload['username'][0]),Action='PUT')
            key={'id':guid}
            print('key', key, 'AttributeUpdates', pay2)
            dynamo.update_item(Key=key, AttributeUpdates=pay2)
        return respond(None, pay2)
    else:
        return respond(ValueError('Unsupported method "{}"'.format(operation)))
