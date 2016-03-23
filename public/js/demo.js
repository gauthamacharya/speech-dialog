/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
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

/* global $:true */

'use strict';

// conversation variables
var conversation_id, client_id;

$(document).ready(function () {
  var $chatInput = $('.chat-window--message-input'),
    $jsonPanel = $('#json-panel .base--textarea'),
    $information = $('.data--information'),
    $profile = $('.data--profile'),
    $loading = $('.loader'),
    $micButton = $('.chat-window--microphone-button');

  // note: these tokens expire after an hour.
  var getSTTToken = $.ajax('/api/speech-to-text/token');
  var getTTSToken = $.ajax('/api/text-to-speech/token');

  var deactivateMicButton = $micButton.removeClass.bind($micButton, 'active');

  function record() {
    getSTTToken.then(function(token) {
      $micButton.addClass('active');
      WatsonSpeech.SpeechToText.recognizeMicrophone({
        token: token,
        continuous: false,
        outputElement: $chatInput[0],
        keepMicrophone: navigator.userAgent.indexOf('Firefox') > 0
      }).promise().then(function() {
        converse($chatInput.val());
      })
      .then(deactivateMicButton)
      .catch(deactivateMicButton);
    });
  }

  $micButton.click(record);

  $chatInput.keyup(function(event){
    if(event.keyCode === 13) {
      converse($(this).val());
    }
  });

  var converse = function(userText) {
    $loading.show();
    // $chatInput.hide();

    // check if the user typed text or not
    if (typeof(userText) !== undefined && $.trim(userText) !== '')
      submitMessage(userText);

    // build the conversation parameters
    var params = { input : userText };

    // check if there is a conversation in place and continue that
    // by specifing the conversation_id and client_id
    if (conversation_id) {
      params.conversation_id = conversation_id;
      params.client_id = client_id;
    }

    $.post('/api/dialog/conversation', params)
      .done(function onSucess(dialog) {
        $chatInput.val(''); // clear the text input

        $jsonPanel.html(JSON.stringify(dialog.conversation, null, 2));

        // update conversation variables
        conversation_id = dialog.conversation.conversation_id;
        client_id = dialog.conversation.client_id;

        console.log(dialog);
        var texts = dialog.conversation.response;
        var response = texts.join('&lt;br/&gt;'); // &lt;br/&gt; is <br/>

        getTTSToken.then(function(token) {
          WatsonSpeech.TextToSpeech.synthesize({
            text: texts,
            token: token,
            voice: 'en-US_AllisonVoice'
          }).addEventListener('ended', record); // trigger the button again once TTS playback stops
        });

        $chatInput.show();
        $chatInput[0].focus();

        $information.empty();

        addProperty($information, 'Dialog ID: ', dialog.dialog_id);
        addProperty($information, 'Conversation ID: ', conversation_id);
        addProperty($information, 'Client ID: ', client_id);

        talk('WATSON', response); // show

        getProfile();
      })
      .fail(function(error){
        talk('WATSON', error.responseJSON ? error.responseJSON.error : error.statusText);
      })
      .always(function always(){
        $loading.hide();
        scrollChatToBottom();
        $chatInput.focus();
      });

  };

  var getProfile = function() {
    var params = {
      conversation_id: conversation_id,
      client_id: client_id
    };

    $.post('/api/dialog/profile', params).done(function(data) {
      $profile.empty();
      data.name_values.forEach(function(par) {
        if (par.value !== '')
          addProperty($profile, par.name + ':', par.value);
      });
    }).fail(function(error){
      talk('WATSON', error.responseJSON ? error.responseJSON.error : error.statusText);
    });
  };

  var scrollChatToBottom = function() {
    var element = $('.chat-box--pane');
    element.animate({
      scrollTop: element[0].scrollHeight
    }, 420);
  };

  var scrollToInput = function() {
      var element = $('.chat-window--message-input');
      $('body, html').animate({
        scrollTop: (element.offset().top - window.innerHeight + element[0].offsetHeight) + 20 + 'px'
      });
  };

  var talk = function(origin, text) {
    var $chatBox = $('.chat-box--item_' + origin).first().clone();
    var $loading = $('.loader');
    $chatBox.find('p').html($('<p/>').html(text).text());
    // $('.chat-box--pane').append($chatBox);
    $chatBox.insertBefore($loading);
    setTimeout(function() {
      $chatBox.removeClass('chat-box--item_HIDDEN');
    }, 100);
  };

  var addProperty = function($parent, name, value) {
    var $property = $('.data--variable').last().clone();
    $property.find('.data--variable-title').text(name);
    $property.find('.data--variable-value').text(value);
    $property.appendTo($parent);
    setTimeout(function() {
      $property.removeClass('hidden');
    }, 100);
  };

  var submitMessage = function(text) {
    talk('YOU', text);
    scrollChatToBottom();
    clearInput();
  };

  var clearInput = function() {
    $('.chat-window--message-input').val('');
  };

  $('.tab-panels--tab').click(function(e){
    e.preventDefault();
    var self = $(this);
    var inputGroup = self.closest('.tab-panels');
    var idName = null;

    inputGroup.find('.active').removeClass('active');
    self.addClass('active');
    idName = self.attr('href');
    $(idName).addClass('active');
  });

  // Initialize the conversation
  converse();
  scrollToInput();

});
