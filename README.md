# elm-react-native-experiment

## What is it?

An experiment pulling elm-native-ui forward to 0.17 and eliminating native js from it in favor of 0.17 style ports

This is a crude modification of https://github.com/elm-native-ui/elm-native-ui to update to 0.17 and explore the possibility
of writing elm react-native apps without having to write native javascript.  The approach taken is an evolution of this
experiment: https://github.com/prozacchiwawa/elm-worker-runner-example , which uses cleanly separated javascript code to host
an elm worker and together make a console app.  It seemed like the same approach would be workable in a variety of scenarios
including react-native, which I've recently been learning about.

Currently, I've only modified index.android.js to work like this.  I don't anticipate the ios version to be much different.

## To run:

~~~~
  $ make
  $ react-native run-android
~~~~

## About the elm code

What's required of a react native elm app in this scenario is to have a main value that is a result of
NativeUi.NativeApp.program applied to a mostly standard elm program configuration:

~~~~
main =
  program
    { init = ({ stack = [], input = "" }, Cmd.none)
    , update = update
    , view = calcView
    , subscriptions = \_ -> Sub.batch [input translateInputString, close (\_ -> Close)]
    , renderPort = render
    , eventPort = event identity
    }
      
-- React Native
port render : Json.Encode.Value -> Cmd msg
port event : ((String, Json.Decode.Value) -> msg) -> Sub msg
~~~~

What's new here is a couple of ports that we use to couple to the outside world and pass into our program
starter.
  
The program starter in turn doesn't use the normal view function (just returns an empty text blob), but instead
emits a first render from the init value of the underlying Html.App.program as a Cmd, and each time an app message
rolls through the update function, another rerender in the form of a Cmd.  Since ports are now functions in elm
0.17, calling the renderPort function with some renderable stuff winds up giving us a token for a side effect,
a Cmd msg.
  
Similarly, the event port is part of the real app's subscriptions and receives events from react native.
  
NativeUi.NativeApp has been modified to scan the emitted VTree data from the user's render function and extract two
sets of information:
  
- A Json.Encode.Value representing the vtree.  Currently it's form is heavily based on the form of elm objects,
because I reused the code from NativeUi's old native js on the javascript side of the port.  This includes a key
for each event handler and what event to listen to.

- A Dict of `(String, Json.Decode.Decoder Action)` representing the event handlers from the tree.

When react fires an event, a pair of `(String, Json.Decode.Value)` is passed through the port and mated with the
stored decoder corresponding to the given key.  If the decoder works, then the result is handled as a message to
the client elm app.  The key names are created unique for a specific render by NativeApp and don't need user
intervention.

## The Javascript? :-/

index.android.js is a total wreck of a mess, but contains the details of the vtree decoding and event binding, 
which is mostly stolen from elm-native-ui, but streamlined slightly.  If this is to be more than an experiment,
this hosting code will have to be written to accept arbitrary elm components, and do some other tasks like
automatically keeping a list of registered react components for the VTree to reference.  At this point, I mainly
want to start a discussion.
