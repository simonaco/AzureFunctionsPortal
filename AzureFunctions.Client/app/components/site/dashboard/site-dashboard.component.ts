import {Component, OnInit, EventEmitter, Input, ViewChild} from '@angular/core';
import {Observable, Subject} from 'rxjs/Rx';
import {TabsComponent} from '../../tabs/tabs.component';
import {TabComponent} from '../../tabs/tab.component';
import {SiteTabNames} from '../../../models/constants';
import {BreadcrumbsComponent} from '../../breadcrumbs/breadcrumbs.component';
import {SiteSummaryComponent} from '../summary/site-summary.component';
// import {SiteMonitorComponent} from './site-monitor.component';
import {SiteManageComponent} from '../manage/site-manage.component';
// import {DeploymentSourceComponent} from '../deploymentSource/deployment-source.component';
import {CacheService} from '../../../services/cache.service';
// import {BusyService} from '../../../services/busy.service';
import {TreeViewInfo} from '../../treeview/models/tree-view-info';
import {DashboardType} from '../../treeview/models/dashboard-type';
import {Descriptor, SiteDescriptor} from '../../../common/resourceDescriptors';
import {ArmObj} from '../../../models/arm/arm-obj';
import {Site} from '../../../models/arm/site';

@Component({
    selector: 'site-dashboard',
    templateUrl: 'app/components/site/dashboard/site-dashboard.component.html',
    directives: [
        TabsComponent,
        TabComponent,
        SiteSummaryComponent,
        // SiteMonitorComponent,
        SiteManageComponent,
        // DeploymentSourceComponent,
        BreadcrumbsComponent
    ],
    inputs: ['viewInfoInput']
})

export class SiteDashboardComponent {
    public selectedTabTitle: string = "";
    public site : ArmObj<Site>;
    public descriptor : Descriptor;
    private _viewInfo : Subject<TreeViewInfo>;
    @ViewChild(TabsComponent) tabs : TabsComponent;

    public TabNames = SiteTabNames;

    public activeComponent = "";

    constructor(private _cacheService : CacheService
    // private _busyService : BusyService)
     ) {
        this._viewInfo = new Subject<TreeViewInfo>();
        this._viewInfo
            .distinctUntilChanged()
            .switchMap(viewInfo =>{
                // this._busyService.isBusy = true;
                return this._cacheService.getArmResource(viewInfo.resourceId);
            })
            .subscribe((site : ArmObj<Site>) =>{
                // this._busyService.isBusy = false;
                this.site = site;
            })
    }

    set viewInfoInput(viewInfo : TreeViewInfo){
        this.descriptor = new SiteDescriptor(viewInfo.resourceId);
        this._viewInfo.next(viewInfo);
    }

    onTabSelected(selectedTab: TabComponent) {
        this.selectedTabTitle = selectedTab.title;
    }

    onTabClosed(closedTab: TabComponent){
        // For now only support a single dynamic tab
        this.activeComponent = "";
    }

    openTab(component : string){
        this.activeComponent = component;
        
        setTimeout(() =>{
            let tabs = this.tabs.tabs.toArray();
            this.tabs.selectTab(tabs[tabs.length-1]);
        }, 100);
    }
}