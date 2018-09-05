/*
 * Copyright (c) 2018 Alibaba Group Holding Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/*
 * The example demonstrates connecting a simulated light sensor to a LinkEdge
 * gateway using LinkEdge Thing Access Node.js SDK. The sensor will continuously
 * report the measured illuminance. Since the function is long-lived it will run
 * forever when deployed to a LinkEdge gateway.
 */

'use strict';

const {
  RESULT_SUCCESS,
  RESULT_FAILURE,
  ThingAccessClient,
} = require('linkedge-thing-access-sdk');

// Retrieves configs from the FC_DRIVER_CONFIG variable.
var driverConfig;
try {
  driverConfig = JSON.parse(process.env.FC_DRIVER_CONFIG)
} catch (err) {
  throw new Error('The driver config is not in JSON format!');
}
var configs = driverConfig['deviceList'];
if (!Array.isArray(configs) || configs.length === 0) {
  throw new Error('No device is bound with the driver!');
}

var args = configs.map((config) => {
  var self = {
    lightSensor: {
      illuminance: 100,
    },
    config,
    callbacks: {
      setProperties: function (properties) {
        console.log('Set properties %s to thing %s-%s', JSON.stringify(properties),
          config.productKey, config.deviceName);
        return {
          code: RESULT_FAILURE,
          message: 'The property is read-only.',
        };
      },
      getProperties: function (keys) {
        console.log('Get properties %s from thing %s-%s', JSON.stringify(keys),
          config.productKey, config.deviceName);
        if (keys.includes('MeasuredIlluminance')) {
          return {
            code: RESULT_SUCCESS,
            message: 'success',
            params: {
              'MeasuredIlluminance': self.lightSensor.illuminance,
            }
          };
        }
        return {
          code: RESULT_FAILURE,
          message: 'The requested properties does not exist.',
        }
      },
      callService: function (name, args) {
        console.log('Call service %s with %s on thing %s-%s', JSON.stringify(name),
          JSON.stringify(args), config.productKey, config.deviceName);
        return {
          code: RESULT_FAILURE,
          message: 'The requested service does not exist.',
        };
      }
    },
  };
  return self;
});

// Connects to LinkEdge platform.
args.forEach((item) => {
  var client = new ThingAccessClient(item.config, item.callbacks);
  client.setup()
    .then(() => {
      return client.registerAndOnline();
    })
    .then(() => {
      // Push events and properties to LinkEdge platform every 2 seconds.
      return new Promise(() => {
        setInterval(() => {
          if (item.lightSensor.illuminance >= 600) {
            item.lightSensor.illuminance = 100;
          } else {
            item.lightSensor.illuminance += 100;
          }
          var properties = {'MeasuredIlluminance': item.lightSensor.illuminance};
          console.log(`Report properties: ${JSON.stringify(properties)}`);
          client.reportProperties(properties);
        }, 2000);
      });
    })
    .catch(err => {
      console.log(err);
      client.cleanup();
    })
    .catch(err => {
      console.log(err);
    });
});

// This is a handler which never be invoked in the example.
module.exports.handler = function (event, context, callback) {
  console.log(event);
  console.log(context);
  callback(null);
};
