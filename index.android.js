/**
 * A react native app hosting an elm worker.
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import ReactNative from 'react-native';
import {
    AppRegistry,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Button from 'react-native-button';
import KeyboardSpacer from 'react-native-keyboard-spacer';
var ImportedReactElements = { Button: Button, KeyboardSpacer: KeyboardSpacer };

// Kick our elm code in a worker
var calc = require('./elm-react-native-calc/calc');
var runner = calc.Main.worker();

// Code mostly derived from elm-native-ui
function vtreeToReactElement(vtree) {
    switch (vtree.ctor) {
    case 'VString':
        {
            return vtree._0;
        }
    case 'VNode':
        {
            var tagName = vtree._0;
            var propertyList = vtree._1;
            var childNodes = vtree._2;

            var reactClass = ReactNative[tagName] || ImportedReactElements[tagName];
            var props = propertyListToObject(propertyList);
            var children = childNodes.map(vtreeToReactElement);

            var args = [reactClass, props].concat(children);
            return React.createElement.apply(null, args);
        }
    default:
        throw new Error("I don't know how to render a VTree of type '" + vtree.ctor + "'\n" +
                        "If you've recently added a new type of VTree, you must add a new case to\n" +
                        "the switch statement in Native.NativeUi.vtreeToReactElement");
    }
}

function propertyToObject(property) {
    switch (property.ctor) {
    case 'JsonProperty':
        return {
            key: property._0,
            value: property._1,
        };
    case 'EventHandler':
        return {
            key: property._0,
            value: (a) => { a.persist(); console.log("Sending event to elm: " + property._0 + " to " + property._1); runner.ports.event.send([property._1, a]); }
        };
    default:
        throw new Error("I don't know how to handle a Property of type '" + property.ctor + "'\n" +
                        "If you've recently added a new type of Property, you must edit the\n" +
                        "function Native.NativeUi.propertyToObject");
    }
}

function propertyListToObject(list)
{
  	var object = {};
    for (var i = 0; i < list.length; i++) {
  		var entry = propertyToObject(list[i]);
  		object[entry.key] = entry.value;
  	}
  	return object;
}

// Setup code, as simple as possible?
var eventQueue = [];
var notify = null;
runner.ports.render.subscribe((vtree) => {
    if (notify) {
        notify.setState({_elmVTree: vtreeToReactElement(vtree)});
    } else {
        eventQueue.push({_elmVTree: vtreeToReactElement(vtree)});
    }
});

class AndroidCalc extends Component {
    constructor(props) {
        super(props);
        this.state = {
            _elmVTree: null
        };
    }
    componentWillMount() {
        while (eventQueue.length > 0) {
            var evq = eventQueue;
            eventQueue = [];
            for (var i = 0; i < evq.length; i++) {
                this.setState(evq[i]);
            }
        }
        notify = this;
    }
    render() {
        return !this.state._elmVTree ?
            <View>
                <Text>Nothing Yet</Text>
            </View> :
            this.state._elmVTree;
    };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('AndroidCalc', () => AndroidCalc);
