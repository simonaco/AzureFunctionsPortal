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

    constructor(
        sideNav : SideNavComponent,
        private _siteArmObj : ArmObj<Site>,
        private _function : FunctionInfo){

        super(sideNav, _siteArmObj.id + "/functions/" + _function.name);
        this.title = _function.name;
    }

    protected _loadChildren(){
        this.children = [
            new FunctionDevelopNode(this.sideNav, this._siteArmObj, this._function),
            new FunctionIntegrateNode(this.sideNav, this._siteArmObj, this._function),
            new FunctionManageNode(this.sideNav, this._siteArmObj, this._function),
            new FunctionMonitorNode(this.sideNav, this._siteArmObj, this._function)
        ]

        this._doneLoading();
    }

    protected _getViewData() : any{
        return this._function;
    }
}

export class FunctionDevelopNode extends TreeNode{
    public title = "Develop";
    public dashboardType = DashboardType.function;

    constructor(
        sideNav : SideNavComponent,
        private _siteArmObj : ArmObj<Site>,
        private _function : FunctionInfo){

        super(sideNav, _siteArmObj.id + "/functions/" + _function.name + "/develop");
    }

    protected _getViewData() : any{
        return this._function;
    }
}

export class FunctionIntegrateNode extends TreeNode{
    public title = "Integrate";
    public dashboardType = DashboardType.function;

    constructor(
        sideNav : SideNavComponent,
        private _siteArmObj : ArmObj<Site>,
        private _function : FunctionInfo){

        super(sideNav, _siteArmObj.id + "/functions/" + _function.name + "/integrate");
    }
    
    protected _getViewData() : any{
        return this._function;
    }
}

export class FunctionManageNode extends TreeNode{
    public title = "Manage";
    public dashboardType = DashboardType.function;

    constructor(
        sideNav : SideNavComponent,
        private _siteArmObj : ArmObj<Site>,
        private _function : FunctionInfo){

        super(sideNav, _siteArmObj.id + "/functions/" + _function.name + "/manage");
    }

    protected _getViewData() : any{
        return this._function;
    }
}

export class FunctionMonitorNode extends TreeNode{
    public title = "Monitor";
    public dashboardType = DashboardType.function;

    constructor(
        sideNav : SideNavComponent,
        private _siteArmObj : ArmObj<Site>,
        private _function : FunctionInfo){

        super(sideNav, _siteArmObj.id + "/functions/" + _function.name + "/monitor");
    }

    protected _getViewData() : any{
        return this._function;
    }
}