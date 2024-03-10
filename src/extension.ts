// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { recentlyOpenedProvider } from './recentlyOpenedTreeView';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const treeDataProvider = new recentlyOpenedProvider(context);
	let registeredProvider = vscode.window.registerTreeDataProvider(
		'recentlyOpened',
		treeDataProvider
	);

	context.subscriptions.push(registeredProvider);
	context.subscriptions.push(treeDataProvider);

    const command = 'recentlyOpened.deleteElement';
	// im not sure how this works but
	// this code is `commandHandler = nameless_function`
	// then thte nameless function can accept parameter
	// whatever parameter you put, for example
	// - file:string
	// - index:number
	// - recentlyOpenedProvider: recentlyOpenedProvider
	// they all will have the same value
	// I believe these values are passed in by `vscode.commands.registerCommand` function
    const commandHandler = (treeItem: any) => {
		treeDataProvider.deleteFile(treeItem);
    };

    // Register the command
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

}

// This method is called when your extension is deactivated
export function deactivate() {}
