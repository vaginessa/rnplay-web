'use strict';

import React, { Component } from 'react';
import classNames from 'classNames';
import CodeMirror from 'codemirror';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/keymap/vim';

import Editor from './Editor';
import Footer from './footer.js';
import ErrorView from './ErrorView';
import Simulator from './Simulator';

export default class EditorApp extends Component {

  constructor(props, context) {
    super(props, context);
    this.simulatorActive = false;
  }

  componentWillMount() {
    window.addEventListener('message', this.handleSimulatorEvent, false);
  }

  componentDidMount() {
    CodeMirror.commands.save = this.onFileSave;
    this.simulatorIframe = document.querySelector('iframe');
  }

  componentWillReceiveProps(nextProps) {
    const { buildId, buildUpdated, appSaveInProgress } = this.props;
    const { appSaveInProgress: saveStillInProgress, appSaveError, forkToken } = nextProps;
    const { simulatorActive } = this;

    if (forkToken) {
      window.location.href = `/apps/${forkToken}`;
      return;
    }

    if (appSaveInProgress && !saveStillInProgress && !appSaveError) {
      if (buildUpdated) {
        window.location.reload();
      } else {
        const isOldBuild = parseInt(buildId) < 3;
        const iframe = this.simulatorIframe;
        // From 0.4.4 and up, we enable live reload - no need to reload the app
        if (isOldBuild) {
          if (simulatorActive) {
            iframe.contentWindow.postMessage('restartApp', '*');
          } else {
            iframe.contentWindow.postMessage('requestSession', '*');
          }
        } else if (!simulatorActive) {
          iframe.contentWindow.postMessage('requestSession', '*');
        }
      }
    }
  }

  sendHeartBeat = () => {
    this.simulatorIframe.contentWindow.postMessage('heartbeat', '*');
  }

  // Keep track of simulator lifecycle
  handleSimulatorEvent = (e) => {
    const { data } = e;
    const { dispatch, log } = this.props;
    if (data === 'sessionRequested') {
      this.simulatorActive = true;
    } else if (data === 'sessionEnded') {
      this.simulatorActive = false;
    }
    
    dispatch(log(data));
  }

  onUpdateName = (name) => {
    const { dispatch, updateName } = this.props;
    dispatch(updateName(name));
  }

  onUpdateBody = (newBody) => {
    const { dispatch, updateBody, currentFile } = this.props;
    dispatch(updateBody(currentFile, newBody));
  }

  onUpdateBuild = (buildId) => {
    const { dispatch, updateBuildId } = this.props;
    dispatch(updateBuildId(buildId));
  }

  onPick = () => {
    const { dispatch, toggleAppPickStatus, appIsPicked, app: { id } } = this.props;
    dispatch(toggleAppPickStatus(id, !appIsPicked));

  }

  onChangeFile = (filename) => {
    const { dispatch, switchFile } = this.props;
    dispatch(switchFile(filename));
  }

  /**
   * Triggers saving of the current file, if the buffer as been modified
   */
  onFileSave = () => {
    const { dispatch, saveFile, fileBodies, currentFile, app: { id } } = this.props;
    const fileBody = fileBodies[currentFile];

    if (fileBody) {
      dispatch(saveFile(id, currentFile, fileBody));
    }
  }

  onSave = () => {
    const { dispatch, saveApp, fileBodies, name, buildId, app: { id} } = this.props;
    dispatch(saveApp(id, name, buildId, fileBodies));
  }

  onFork = () => {
    const { dispatch, forkApp, app: { urlToken } } = this.props;
    dispatch(forkApp(urlToken));
  }

  onFileSelectorToggle = () => {
    const { dispatch, toggleFileSelector } = this.props;
    dispatch(toggleFileSelector());
  }

  render() {
    const {
      useDarkTheme,
      useVimKeyBindings,
      app,
      currentUser,
      builds,
      showHeader,
      name,
      currentFile,
      fileTree,
      buildId,
      appSaveError,
      appIsPicked,
      fileSelectorOpen,
      logs
    } = this.props;

    const {
      onFileSelectorToggle,
      onUpdateName,
      onUpdateBuild,
      onChangeFile,
      onUpdateBody,
      onPick,
      onSave,
      onFork
    } = this;

    const { appetizeUrl } = app;

    const simulatorUrl = useDarkTheme ?
      appetizeUrl.replace('deviceColor=white', 'deviceColor=black') :
      appetizeUrl;

    const editorHeaderProps = {
      name,
      useDarkTheme,
      app,
      appIsPicked,
      currentUser,
      onUpdateName,
      onPick,
      onSave,
      onFork
    };

    const editorProps = {
      app,
      fileTree,
      currentFile,
      currentUser,
      useVimKeyBindings,
      useDarkTheme,
      onChangeFile,
      onUpdateBody,
      fileSelectorOpen,
      onFileSelectorToggle,
      logs
    };

    const buildPickerProps = {
      builds,
      buildId,
      onUpdateBuild,
    };

    const classes = classNames({
      'editor-app': true,
      'dark-theme': useDarkTheme
    });

    return (
      <div onKeyUp={this.sendHeartBeat} className={classes}>

        <Editor editorHeaderProps={editorHeaderProps} {...editorProps} />

        <Simulator
          url={simulatorUrl}
          app={this.props.app}
          useDarkTheme={useDarkTheme}
          {...buildPickerProps}
        />

      </div>
    );
  }
};
