import {Component, OnInit, EventEmitter, OnDestroy, Output} from '@angular/core';
import {Observable, ReplaySubject, Subject} from 'rxjs/Rx';
import {TreeNode} from '../treeview/tree-node';
import {AppsNode} from '../treeview/apps-node';
import {TreeViewComponent} from '../treeview/tree-view.component';
import {ArmService} from '../../services/arm.service';
import {CacheService} from '../../services/cache.service';
import {FunctionsService} from '../../services/functions.service';
import {GlobalStateService} from '../../services/global-state.service';
import {BroadcastService} from '../../services/broadcast.service';
import {TranslateService} from 'ng2-translate/ng2-translate';
import {DropDownComponent} from '../drop-down.component';
import {DropDownElement} from '../../models/drop-down-element';
import {TreeViewInfo} from '../treeview/models/tree-view-info';
import {Subscription} from '../../models/subscription';

@Component({
    selector: 'sidenav',
    templateUrl: 'app/components/sidenav/sidenav.component.html',
    directives: [TreeViewComponent, DropDownComponent]
})
export class SideNavComponent{
    @Output() treeViewInfoEvent: EventEmitter<TreeViewInfo>;

    public rootNode : TreeNode;
    public subscriptions: DropDownElement<Subscription>[] = [];
    public subscriptionIdObs = new ReplaySubject<string>(1);
    public subscriptionId : string;

    private _viewInfo : TreeViewInfo;

    constructor(
        public armService : ArmService,
        public cacheService : CacheService,
        public functionsService : FunctionsService,
        // public globalStateService : GlobalStateService,
        // public broadcastService : BroadcastService,
        public translateService : TranslateService){

        this.rootNode = new TreeNode(this, null);
        this.rootNode.children = [new AppsNode(this, null, this.subscriptionIdObs)];

        this.armService.subscriptions.subscribe(subs =>{
            this.subscriptions = subs.map(e =>({displayLabel: e.displayName, value: e}))
                .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
        })
    }

    onSubscriptionSelect(subscription: Subscription) {
        this.subscriptionId = subscription.subscriptionId;
        this.subscriptionIdObs.next(this.subscriptionId);
        // if(this.term.value){
        //     return this.armService.search(this.term.value, this.subscriptionId)
        //         .map<TreeNode[]>(response =>{
        //             return response.json().value.map(armObj =>{
        //                 switch(armObj.type){
        //                     case "Microsoft.Web/sites":
        //                         return new AppNode(this, armObj, true);
        //                     case "Microsoft.Web/sites/slots":
        //                         return new SlotNode(this, armObj, true);
        //                     case "Microsoft.Web/serverFarms":
        //                         return new PlanNode(this, armObj, true);
        //                     case "Microsoft.Web/hostingEnvironments":
        //                         return new EnvironmentNode(this, armObj, true);
        //                     default:
        //                         return new TreeNode(this, armObj.id);
        //                 }
        //             })
        //         }).subscribe(items =>{
        //             this.searchNode.children = <TreeNode[]>items;
        //         });
        // }
        
    }

}