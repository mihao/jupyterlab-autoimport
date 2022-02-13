import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab-autoimport extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-autoimport:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-autoimport is activated!');
  }
};

export default plugin;
