import * as vscode from 'vscode';
import * as path from 'path';

interface ISerializedFile {
  serializedUri: string;
  fileName: string;
}

export class RecentFilesProvider extends vscode.Disposable implements vscode.TreeDataProvider<RecentFile> {
  private model: RecentFile[] = [];
  private disposables: vscode.Disposable[] = [];

  private _onDidChangeTreeData: vscode.EventEmitter<void | RecentFile | RecentFile[] | null | undefined> =
    new vscode.EventEmitter<void | RecentFile | RecentFile[] | null | undefined>();
  onDidChangeTreeData?: vscode.Event<void | RecentFile | RecentFile[] | null | undefined> | undefined =
    this._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    super(() => this.dispose());

    // fail safe check
    // if not array, set it to array.
    // Because, when you `this.context.workspaceState.update('recentFiles', 'Hello Word');`
    // that is, update the tree into something that is not array,
    // the extension will fail the rest of the code
    let check_is_array = context.workspaceState.get('recentFiles', []);
    if(!Array.isArray(check_is_array))
      this.context.workspaceState.update('recentFiles', []);

    // get the explorer id specified in /workspace/recent-files/package.json
    this.model = context.workspaceState.get('recentFiles', [])
      .map((serialized: ISerializedFile) => RecentFile.fromJSON(serialized));

    vscode.workspace.textDocuments.forEach((document) => {
      this.addFile(document);
    });

    this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.addFile(editor.document);
        this._onDidChangeTreeData.fire(undefined);
      }
    }));
  }

  private addFile(document: vscode.TextDocument) {
	// If the file does not exists in the array
    if (this.model.find((file) => file.uri.path === document.uri.path) === undefined) {
		  // then add to the beginning of array
      let uri = document.uri;
      let fileName = path.basename(document.fileName);
      let filePath = uri.toString().substring(("file://").length);
      fileName = fileName + '\t' + '(' + filePath + ')'
      this.model.splice(0, 0, new RecentFile(uri, fileName));
    }
	// else, remove the existing fiel from its index, then add it back to the latest index of array
	else {
		const matchingIndex = this.model.findIndex((file) => file.uri.path === document.uri.path);
		// If matching file found, remove it from the model
		if (matchingIndex !== -1) {
			const removedFile = this.model.splice(matchingIndex, 1)[0];
			// Add the removed file as a new entry at the beginning of the model
			this.model.splice(0, 0, removedFile);
		}
	}

  // if exceed maximum size, delete the last element from array
  if(this.model.length > 20)
  {
    this.model.pop();
  }

  // udpate array to the explorer id specified in /workspace/recent-files/package.json
  // this only takes effect after you reload the window twice (the new pops up after you press F5)
	this.context.workspaceState.update('recentFiles', this.model.map((file) => file.toJSON()));
  }

  getTreeItem(element: RecentFile): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: RecentFile | undefined): vscode.ProviderResult<RecentFile[]> {
    if (element instanceof RecentFile) {
      return [];
    }

    return this.model;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}


class RecentFile extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly fileName: string
  ) {
    super(fileName);

    this.resourceUri = uri;
    // this one activates vscode to open the file in new tab
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [this.uri]
    };
  }

  toJSON(): ISerializedFile {
    return {
      serializedUri: this.uri.toString(),
      fileName: this.fileName
    };
  }

  static fromJSON(serialized: ISerializedFile): RecentFile {
    return new RecentFile(vscode.Uri.parse(serialized.serializedUri), serialized.fileName);
  }
}