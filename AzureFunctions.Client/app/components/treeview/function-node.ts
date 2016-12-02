import { TreeNode } from './tree-node';
import { SideNavComponent } from '../sidenav/sidenav.component';
import { Subject } from 'rxjs/Rx';
import { DashboardType } from './models/dashboard-type';
import { Site } from '../../models/arm/site';
import { ArmObj } from '../../models/arm/arm-obj';
import {FunctionContainer} from '../../models/function-container';
import {BroadcastEvent} from '../../models/broadcast-event';
import {PortalResources} from '../../models/portal-resources';
import {FunctionInfo} from '../../models/function-info';

export class FunctionNode extends TreeNode{
    public title = "Functions";
    public dashboardType = DashboardType.collection;
    private _functions : FunctionInfo[]; 

    constructor(
        sideNav : SideNavComponent,
        private _siteArmObj : ArmObj<Site>,
        private _function : FunctionInfo){

        super(sideNav, _siteArmObj.id + "/functions/" + _function.name);
        this.title = _function.name;
    }
}