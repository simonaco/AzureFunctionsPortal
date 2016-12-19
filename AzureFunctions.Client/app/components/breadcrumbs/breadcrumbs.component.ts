import {Component, ViewChild, Input, OnChanges, SimpleChange} from '@angular/core';
import {Observable, Subscription as RxSubscription} from 'rxjs/Rx';
import {Descriptor} from '../../common/resourceDescriptors';

@Component({
    selector: 'breadcrumbs',
    templateUrl: 'app/components/breadcrumbs/breadcrumbs.component.html',
    inputs: ['descriptorInput']
})
export class BreadcrumbsComponent {
    public descriptor : Descriptor;

    constructor() {
    }

    set descriptorInput(descriptor : Descriptor){
        this.descriptor = descriptor;
    }
}