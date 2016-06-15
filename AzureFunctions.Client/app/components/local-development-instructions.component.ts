import {Component, OnInit, Inject, ElementRef} from '@angular/core';

@Component({
    selector: 'local-develop',
    templateUrl: 'templates/local-development-instructions.component.html',
    styleUrls: ['styles/local-development-instructions.style.css']
})
export class LocalDevelopmentInstructionsComponent implements OnInit {
    private shown: boolean = false;
    private selectedMode: string = 'Azure';
    constructor(@Inject(ElementRef) private _elementRef: ElementRef) { }

    ngOnInit() { }

    show() {
        this.shown = true;
        setTimeout(() => this._elementRef.nativeElement.querySelector('.wrapper').focus(), 20);
    }

    onBlur() {
        this.shown = false;
    }
}