import * as vscode from 'vscode';
import * as path from 'path';

interface ISerializedFile {
    serializedUri: string;
    fileName: string;
}

export class recentlyOpenedProvider extends vscode.Disposable implements vscode.TreeDataProvider<RecentlyOpened> {
    private model: RecentlyOpened[] = [];
    private disposables: vscode.Disposable[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<void | RecentlyOpened | RecentlyOpened[] | null | undefined> 
        = new vscode.EventEmitter<void | RecentlyOpened | RecentlyOpened[] | null | undefined>();
    onDidChangeTreeData?: vscode.Event<void | RecentlyOpened | RecentlyOpened[] | null | undefined> | undefined 
        = this._onDidChangeTreeData.event;

    constructor(private readonly context: vscode.ExtensionContext) 
    {
        super(() => this.dispose());

        // fail safe check
        // if not array, set it to array.
        // Because, when you `this.context.workspaceState.update('recentlyOpened', 'Hello Word');`
        // that is, update the tree into something that is not array,
        // the extension will fail the rest of the code
        let check_is_array = context.workspaceState.get('recentlyOpened', []);
        if(!Array.isArray(check_is_array))
            this.context.workspaceState.update('recentlyOpened', []);
        check_is_array = [];

        // get the explorer id specified in /workspace/recent-files/package.json
        this.model = context.workspaceState
            .get('recentlyOpened', [])
            .map((serialized: ISerializedFile) => RecentlyOpened.fromJSON(serialized));

        vscode.workspace.textDocuments.forEach((document) => {
            this.addFile(document);
        });

        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!editor)
                return
            this.addFile(editor.document);
            this._onDidChangeTreeData.fire(undefined);
        }));
    }

    private addFile(document: vscode.TextDocument) 
    {
        // If the file does not exists in the array
        if (this.model.find((file) => file.uri.path === document.uri.path) === undefined) 
        {
            // then add to the beginning of array
            let uri = document.uri;
            let fileName = path.basename(document.fileName).trim();
            let filePath = uri.toString().substring(("file://").length);
            fileName = fileName + '\t' + '(' + filePath + ')'
            this.model.splice(0, 0, new RecentlyOpened(uri, fileName));
        }
        // else, remove the existing fiel from its index, then add it back to the latest index of array
        else 
        {
            const matchingIndex = this.model.findIndex((file) => file.uri.path === document.uri.path);
            // If matching file found, remove it from the model
            if (matchingIndex !== -1) {
                const removedFile = this.model.splice(matchingIndex, 1)[0];
                // Add the removed file as a new entry at the beginning of the model
                this.model.splice(0, 0, removedFile);
            }
        }

        // if exceed maximum size, delete the last element from array
        while(this.model.length > 50)
            this.model.pop();

        // udpate array to the explorer id specified in /workspace/recent-files/package.json
        // this only takes effect after you reload the window twice (the new pops up after you press F5)
        this.context.workspaceState.update('recentlyOpened', this.model.map((file) => file.toJSON()));
    }

    public deleteFile(treeItem: any) 
    {
        // find the file in the array, get its index
        const matchingIndex = this.model.findIndex((file) => file.uri.path === treeItem.uri.path);
        // Remove the file from array from its index
        this.model.splice(matchingIndex, 1);
        // update the tree view
        this._onDidChangeTreeData.fire(undefined);
    	this.context.workspaceState.update('recentlyOpened', this.model.map((file) => file.toJSON()));
    }

    getTreeItem(element: RecentlyOpened): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: RecentlyOpened | undefined): vscode.ProviderResult<RecentlyOpened[]> {
        if (element instanceof RecentlyOpened)
            return [];

        return this.model;
    }

    dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
}

class RecentlyOpened extends vscode.TreeItem {
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

    static fromJSON(serialized: ISerializedFile): RecentlyOpened {
        return new RecentlyOpened(vscode.Uri.parse(serialized.serializedUri), serialized.fileName);
    }
}