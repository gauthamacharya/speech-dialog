'use strict';

var express      = require('express'),
  router          = express.Router(),
  vcapServices = require('vcap_services'),
  bluemix    = require('./config/bluemix'),
  extend       = require('util')._extend,
  watson       = require('watson-developer-cloud');


//setup endpoint for dialog services

// if bluemix credentials exists, then override local
var credentials =  extend({
  url: '<url>',
  username: '<username>',
  password: '<password>',
  version: 'v1'
}, bluemix.getServiceCreds('dialog')); // VCAP_SERVICES



var dialog_id = process.env.DIALOG_ID || '<missing-dialog-id>';

// Create the service wrapper
var dialog = watson.dialog(credentials);
console.log('Using Dialog ID', dialog_id);
console.log('Using Dialog Service credentials', credentials);
console.log('Using dialog', dialog);


router.post('/conversation', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  console.log(params);
  dialog.conversation(params, function(err, results) {
    console.log("Dialog Conversation Error: ",err);
	console.log("Dialog Convesation Results:",results);
	if (err)
      return next(err);
    else
      res.json({ dialog_id: dialog_id, conversation: results});
  });
});

router.post('/profile', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  dialog.getProfile(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});
  
console.log(process.env.VCAP_SERVICES);

module.exports = router;
