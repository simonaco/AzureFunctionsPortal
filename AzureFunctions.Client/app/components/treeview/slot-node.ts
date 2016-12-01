import {TreeNode} from './tree-node';
import {DashboardType} from './models/dashboard-type';
import {SideNavComponent} from '../sidenav/sidenav.component';
import {ArmObj} from '../../models/arm/arm-obj';
import {Site} from '../../models/arm/site';

export class SlotNode extends TreeNode{
    public showIcon = false;
    public dashboardType = DashboardType.app;

    constructor(sideBar : SideNavComponent, slot : ArmObj<Site>, isSearchResult : boolean){
        super(sideBar, slot.id);
        this.title = isSearchResult ? `${slot.name} (App Slot)` : slot.name;
    }
}