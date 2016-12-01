import {TreeNode} from './tree-node';
import {DashboardType} from './models/dashboard-type';
import {SideNavComponent} from '../sidenav/sidenav.component';
import {ArmObj} from '../../models/arm/arm-obj';
import {Site} from '../../models/arm/site';
import {SlotNode} from './slot-node';

export class SlotsNode extends TreeNode{
    public dashboardType = DashboardType.collection;
    public title = "Slots";
    
    constructor(sideNav : SideNavComponent, private _siteArmObj : ArmObj<Site>){
        super(sideNav, _siteArmObj.id + "/slots");
    }
    
    protected _loadChildren(){
        this._doneLoading();

        // this.sideNav.armService.getSlotsForSite(this._siteArmObj.id)
        //     .subscribe(slots =>{
        //         this.children = slots.map(slot =>{
        //             return new SlotNode(this.sideBar, slot, false); 
        //         });

        //         this._doneLoading();
        //     })        
    }
}
