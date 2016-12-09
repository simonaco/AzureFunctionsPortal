import {Component, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import {SideNavComponent} from '../sidenav/sidenav.component';
import {ResourceType, Descriptor, SiteDescriptor} from '../../common/resourceDescriptors';
import {TreeViewInfo} from '../treeview/models/tree-view-info';
import {DashboardType} from '../treeview/models/dashboard-type';
import {UserService} from '../../services/user.service';
import {FunctionEditComponent} from '../function-edit.component';

@Component({
    selector: 'main',
    templateUrl: 'app/components/main/main.component.html',
    directives: [SideNavComponent, FunctionEditComponent]
})
export class MainComponent {
    public viewInfo : TreeViewInfo;
    public descriptor : Descriptor;
    public dashboardType : string;
    public inIFrame : boolean;

    constructor(private _userService : UserService) {
        this.inIFrame = _userService.inIFrame;
    }

    updateViewInfo(viewInfo : TreeViewInfo){
        if(viewInfo.dashboardType === DashboardType.collection){
            return;
        }

        this.viewInfo = viewInfo;
        this.dashboardType = DashboardType[viewInfo.dashboardType];

        if(viewInfo.dashboardType !== DashboardType.createApp){
            this.descriptor = Descriptor.getDescriptor(viewInfo.resourceId);
        }
     }
}
