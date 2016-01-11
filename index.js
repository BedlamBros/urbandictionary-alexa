var alexa = require('alexa-app'),
    _     = require('underscore'),
    util  = require('util'),
    urban = require('urban'),
    ssml  = require('ssml');

    // application name
var APP_NAME = 'Urban Dictionary',
    // AWS Lambda timeout
    TIMEOUT_MS = 1000,
    // ms before TIMEOUT_MS when we consider this lambda to be 'timed out'
    TIMEOUT_PREEMPTION_MS = 150,
    // example Term arguments, specifically chosen because of their varying word count
    EXAMPLE_TERMS = '{SJW|Donald Trump|Netflix and Chill|Term}';

var app = new alexa.app(APP_NAME);

app.launch(function(req, res) {
  res.shouldEndSession(false);
  res.reprompt('What word would you like to define?').send();
});

app.intent('DefineIntent', {
  'slots': {
    'Term': 'LITERAL'
  },
  'utterances': _.map([
    'define',
    'define the word',
    'define the term',
    'define the phrase',
    'explain',
    'explain the word',
    'explain the term',
    'explain the phrase'
      ], function(prefix) {
        return prefix + ' ' + EXAMPLE_TERMS;
    }).concat([EXAMPLE_TERMS])
}, function(req, res) {
  var term = req.slot('Term'),
      definition = null,
      example = null;

  if (typeof term === 'undefined') {
    // no term was given
    console.log('No term was given');
    var errmsg = 'Sorry, I did not hear what term you wanted to define';
    res.say(errmsg).card(APP_NAME, errmsg);
    return true;
  }

  var TIMED_OUT = false;
  var timeoutTimer = setTimeout(function() {
    // declare the timeout
    TIMED_OUT = true;
    var errmsg = 'I had trouble communicating with urbandictionary.com';
    // send the error message
    res.say(errmsg).card(APP_NAME, errmsg).send();
  }, TIMEOUT_MS - TIMEOUT_PREEMPTION_MS);

  console.log('Defining term: ' + term);
  urban(term).on('end', function(dictionary) {
    // throw away this handler if timeout was already declared
    if (TIMED_OUT) return;
    var start = new Date();

    // remove the timeout handler from the event queue
    clearTimeout(timeoutTimer);

    if (dictionary.result_type == 'exact' && dictionary.list.length > 0) {
      // word was successfully defined
      var entry = dictionary.list[0];

      definition = ssmlifySentence(entry.definition).replace(/\n/g, breakBy(100));
      if (!!entry.example) {
        example = parseExample(entry.example);
      }
      // state the term itself at beginning of response
      res.say(new ssml().say(term).break(300));
    } else {
      definition = APP_NAME + ' could not find a definition for the term: ' + term;
    }

    res.say(definition);
    if (!!example) {
      // tack on an example usage if one was found
      res.say(new ssml().break(500).say('Used in a sentence').break(300)).say(example);
    }
    res.card('Define ' + term, definition).send();
    console.log(util.format('Urban handler spent %d ms on CPU-bound work. ' +
      'This should be less than %d.',
      new Date().getTime() - start.getTime(), TIMEOUT_PREEMPTION_MS));
  });

  // return false to delay response
  return false;
});

exports.handler = app.lambda();

exports.schema = function() {
  console.log(app.schema());
};

exports.utterances = function() {
  console.log(app.utterances());
};

// take a full sentence and parse the grammar into ssml string
function ssmlifySentence(sentence) {
  var result = new ssml();

  var htmlRegex = /<(?:.|\n)*?>/gm;
  // strip bad html
  sentence = sentence.replace(htmlRegex, '');

  // put in a break where elipses are found
  sentence = sentence.replace(/\.\.\./g, breakBy(250));

  // get rid of brackets that would link to [other term]
  sentence = sentence.replace(/\[/g, '').replace(/\]/g, '');

  return sentence.toString({minimal: true})
    .replace('<speak>', '').replace('</speak>', '');
}

// convert an Urban Dictionary example phrase into ssml
function parseExample(exampleParagraph) {
  var example = new ssml();
  var lines = exampleParagraph.split('\n');

  for (var idx in lines) {
    example = example.say(ssmlifySentence(lines[idx]));
    // do not add a breaks at end of the entire example
    if (parseInt(idx) === lines.length - 1) continue;

    // put breaks between 'Brian: ...\nJohn: ...\nBrian: ...' style conversations
    if (lines[idx].match(/^[A-Za-z0-9# ]+:/gi)) {
      example = example.break(200);
    }
  }
  return example;
}

// create a <break> tag that breaks by ms seconds
var breakBy = function(ms) {
  return new ssml().break(ms)
    .toString({minimal: true})
    .replace('<speak>', '').replace('</speak>', '');
};
