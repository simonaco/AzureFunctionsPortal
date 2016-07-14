import {Directive, EventEmitter, ElementRef} from '@angular/core';
import {Models, Stdio} from './../models/omnisharp-server';
import {OmniService} from './../services/omnisharp.service';

declare var monaco;
declare var require;

@Directive({
    selector: '[monacoEditor]',
    inputs: ['content', 'fileName', 'disabled'],
    outputs: ['onContentChanged', 'onSave']
})
export class MonacoEditorDirective {
    public onContentChanged: EventEmitter<string>;
    public onSave: EventEmitter<string>;    

    private _language: string;
    private _content: string;
    private _disabled: boolean;
    private provider: any;
    private seq: number = 1;
    private editor: any;

    constructor(private elementRef: ElementRef,
        private _omniService: OmniService) {

        require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } }); 

        var that = this;

        require(['vs/editor/editor.main'], function (input:any) {
            
            that.editor = monaco.editor.create(document.getElementById('container'), {

            value: [
                that._content
            ].join('\r\n'),
                language: that._language,
                readOnly: that._disabled
            });

            if (that._language === "csharp") {

                that.provider = monaco.languages.registerCompletionItemProvider('csharp', {
                    provideCompletionItems: () => {

                        //var model:Models.UpdateBufferRequest = {
                        var model: any = {
                            Buffer: that.editor.getValue(),
                            Filename: "C:\\temp\\azure-webjobs-sdk-script\\sample\\TimerTrigger-CSharp\\run.csx"
                        };

                        var request: Stdio.Protocol.RequestPacket = {
                            Type: "request",
                            Seq: that.seq++,
                            Command: "/updatebuffer",
                            Arguments: model
                        };

                        return that._omniService.getOmniSharp(request).then((updatebufferResult: any) => {

                            // let model:Models.AutoCompleteRequest = {
                            let model: any = {
                                Filename: "C:\\temp\\azure-webjobs-sdk-script\\sample\\TimerTrigger-CSharp\\run.csx",
                                Line: that.editor.getPosition().lineNumber,
                                Column: that.editor.getPosition().column,
                                // WordToComplete: "C",
                                // WantDocumentationForEveryCompletionResult: true,
                                WantKind: true,
                                // WantReturnType: true
                            };

                            let request: Stdio.Protocol.RequestPacket = {
                                Type: "request",
                                Seq: that.seq++,
                                Command: "/autocomplete",
                                Arguments: model
                            };

                            return that._omniService.getOmniSharp(request).then((autocompleteResult: any) => {
                                let response: Stdio.Protocol.ResponsePacket = JSON.parse(autocompleteResult._body);

                                var result: any[] = [];
                                if (response.Body) {
                                    response.Body.forEach((element: Models.AutoCompleteResponse) => {
                                        result.push(that.toComplationItem(element));
                                    });
                                }
                                return result;
                            });


                        });


                    }
                });
            }

        });

        this.onContentChanged = new EventEmitter<string>();
        this.onSave = new EventEmitter<string>();
    }

    set content(str: string) {
        if (str) {
            this._content = str;
        }        
    }

    set disabled(value: boolean) {
        this._disabled = value;
    }

    set fileName(fileName: string) {               
        var extension = fileName.split('.').pop().toLowerCase();

        switch (extension) {
            case 'js':
                this._language = "javascript";
                break;
            case 'cs':
            case 'csx':
                this._language = "csharp";
                break;
            default:
                this._language = "xml";
                break;
        }
        
    }

    private toComplationItem(value: Models.AutoCompleteResponse): any {
        var kind: any;
        switch (value.Kind) {
            case "Text": kind = monaco.languages.CompletionItemKind.Text; break;
            case "Method": kind = monaco.languages.CompletionItemKind.Method; break;
            case "Function": kind = monaco.languages.CompletionItemKind.Function; break;
            case "Constructor": kind = monaco.languages.CompletionItemKind.Constructor; break;
            case "Field": kind = monaco.languages.CompletionItemKind.Field; break;
            case "Variable": kind = monaco.languages.CompletionItemKind.Variable; break;
            case "Class": kind = monaco.languages.CompletionItemKind.Class; break;
            case "Interface": kind = monaco.languages.CompletionItemKind.Interface; break;
            case "Module": kind = monaco.languages.CompletionItemKind.Module; break;
            case "Property": kind = monaco.languages.CompletionItemKind.Property; break;
            case "Unit": kind = monaco.languages.CompletionItemKind.Unit; break;
            case "Value": kind = monaco.languages.CompletionItemKind.Value; break;
            case "Enum": kind = monaco.languages.CompletionItemKind.Enum; break;
            case "Keyword": kind = monaco.languages.CompletionItemKind.Keyword; break;
            case "Snippet": kind = monaco.languages.CompletionItemKind.Snippet; break;
            case "Color": kind = monaco.languages.CompletionItemKind.Color; break;
            case "File": kind = monaco.languages.CompletionItemKind.File; break;
            case "Reference": kind = monaco.languages.CompletionItemKind.Reference; break;
        }
        if (!kind) {
            kind = monaco.languages.CompletionItemKind.Text;
        }


        return {
            label: value.DisplayText,
            kind: kind,
            insertText: value.CompletionText
        };
    }
}