import {Directive, EventEmitter, ElementRef} from '@angular/core';

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
    private silent: boolean;

    private _language: string;
    private _content: string;
    private _disabled: boolean;

    constructor(private elementRef: ElementRef) {

        require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } }); 

        var that = this;
        
        require(['vs/editor/editor.main'], function (input:any) {
            
            monaco.editor.create(document.getElementById('container'), {

            value: [
                that._content
            ].join('\r\n'),
                language: that._language,
                readOnly: that._disabled
            });

        });

        this.silent = false;
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
}