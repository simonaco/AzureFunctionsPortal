import {Component, Input} from '@angular/core';

@Component({
    selector: 'aggregate-block',
    templateUrl: 'templates/aggregate-block.component.html',
})

export class AggregateBlock  {
    @Input() value: string;
    @Input() title: string;
}