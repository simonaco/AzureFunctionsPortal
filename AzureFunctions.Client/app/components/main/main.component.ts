import {Component, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import {SideNavComponent} from '../sidenav/sidenav.component';

@Component({
    selector: 'main',
    templateUrl: 'app/components/main/main.component.html',
    directives: [SideNavComponent]
})
export class MainComponent {

    constructor(
    ) {
    }

}
