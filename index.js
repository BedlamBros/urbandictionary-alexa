var alexa = require('alexa-app'),
    _     = require('underscore'),
    urban = require('urban');

var APP_NAME = 'urbandictionary';

var app = new alexa.app(APP_NAME);

app.intent('DefineIntent', {
  'slots': {
    'Term': 'LITERAL'
  },
  'utterances': [
    'define {Term|Term}'
  ]
}, function(req, res) {
  var term = req.slot('Term');

  res.say('All good');
  res.card(APP_NAME, 'All good');
});

exports.handler = app.lambda();

exports.schema = function() {
  console.log(app.schema());
};

exports.utterances = function() {
  console.log(app.utterances());
};
