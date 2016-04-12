import {Component, OnInit, Input} from 'angular2/core';

@Component({
    selector: 'top-bar-button',
    templateUrl: 'templates/top-bar-button.component.html'
})
export class TopBarButtonComponent implements OnInit {
    @Input() public name: string;
    public isSelected: boolean;

    constructor() { }

    ngOnInit() { }
}