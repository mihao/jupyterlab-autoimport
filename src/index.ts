import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { isCodeCellModel } from '@jupyterlab/cells';
import { KernelMessage } from '@jupyterlab/services';
import { SimplifiedOutputArea, OutputAreaModel } from '@jupyterlab/outputarea';
import { ElementExt } from '@lumino/domutils';
import { findIndex } from '@lumino/algorithm';

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/autoimport:plugin',
  autoStart: true,
  optional: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker | null
  ) => {
    app.commands.addCommand('refresh-imports', {
      label: 'Refresh Imports',
      execute: () => {
        const current = notebookTracker?.currentWidget;
        const notebook = current?.content;
        if (
          !current ||
          current !== app.shell.currentWidget ||
          !notebook?.model ||
          !notebook.activeCell
        ) {
          return;
        }
        const outputArea = new SimplifiedOutputArea({
          model: new OutputAreaModel(),
          rendermime: current.content.rendermime
        });
        const printImports = `
          if '_imported' not in dir(get_ipython().user_ns):
            %load_ext ipython_autoimport
          print(*get_ipython().user_ns._imported, sep='\\n')
        `;
        SimplifiedOutputArea.execute(
          printImports,
          outputArea,
          current.sessionContext
        ).then((msg: KernelMessage.IExecuteReplyMsg | undefined) => {
          if (msg?.content.status !== 'ok') {
            if (msg?.content.status === 'error') {
              alert(`${msg.content.ename}\n${msg.content.evalue}`);
            } else if (msg) {
              alert(msg.content.status);
            } else {
              alert('Unknown problem');
            }
            return;
          }
          const imports = outputArea.model
            .toJSON()
            .map(output => output.text)
            .join('');
          let importsText = imports != null ? imports.replace(/\n+$/, '') : ''; // eslint-disable-line eqeqeq
          notebook.activeCellIndex = 0;
          const firstCodeCellIndex = findIndex(
            notebook.model?.cells || [],
            (cell, index) => isCodeCellModel(cell)
          );
          if (firstCodeCellIndex !== -1) {
            notebook.activeCellIndex = firstCodeCellIndex;
          }
          notebook.deselectAll();
          if (
            notebook.activeCell === null ||
            !isCodeCellModel(notebook.activeCell.model)
          ) {
            return;
          }
          ElementExt.scrollIntoViewIfNeeded(
            notebook.node,
            notebook.activeCell.node
          );
          const cellText = notebook.activeCell.model.value.text;
          const start = cellText.match(/^(import|from) /m)?.index;
          const end = start != null ? cellText.indexOf('\n\n', start) : null; // eslint-disable-line eqeqeq
          let before, after;
          const foundImportBlock = start != null && end != null; // eslint-disable-line eqeqeq
          if (foundImportBlock) {
            before = cellText.slice(0, start);
            after = end >= 0 ? cellText.slice(end) : '';
          } else {
            before = '';
            after = cellText;
          }
          after = after.replace(/^\n+/, '');
          if (importsText !== '' && after !== '') {
            importsText = importsText + '\n\n';
          }
          notebook.activeCell.model.value.text = before + importsText + after;
        });
      }
    });

    app.commands.addKeyBinding({
      command: 'refresh-imports',
      keys: ['Accel K'],
      selector: '.jp-Notebook'
    });
  }
};

export default plugin;
