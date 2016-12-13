import {Component, Input} from '@angular/core';
import {Subject} from 'rxjs/Rx';
// import {FunctionsService} from '../services/functions.service';
import {FunctionInfo} from '../models/function-info';
import {FunctionConfig} from '../models/function-config';
import {BroadcastService} from '../services/broadcast.service';
import {BroadcastEvent} from '../models/broadcast-event'
import {SelectOption} from '../models/select-option';
import {RadioSelectorComponent} from './radio-selector.component';
import {PortalService} from '../services/portal.service';
import {GlobalStateService} from '../services/global-state.service';
import {TranslateService, TranslatePipe} from 'ng2-translate/ng2-translate';
import {PortalResources} from '../models/portal-resources';
import {FunctionKeysComponent} from './function-keys.component';
import {FunctionApp} from '../services/function-app';

@Component({
    selector: 'function-manage',
    templateUrl: 'templates/function-manage.component.html',
    styleUrls: ['styles/function-manage.style.css'],
    directives: [RadioSelectorComponent, FunctionKeysComponent],
    pipes: [TranslatePipe],
    inputs: ['selectedFunction']
})
export class FunctionManageComponent {
    // @Input() selectedFunction: FunctionInfo;
    public functionStatusOptions: SelectOption<boolean>[];
    public disabled: boolean;
    public functionInfo : FunctionInfo;
    public functionApp : FunctionApp;
    private valueChange: Subject<boolean>;
    private _functionStream : Subject<FunctionInfo>;

    constructor(private _broadcastService: BroadcastService,
                private _portalService: PortalService,
                private _globalStateService: GlobalStateService,
                private _translateService: TranslateService) {

        this._functionStream = new Subject<FunctionInfo>();
        this._functionStream
            .distinctUntilChanged()
            .subscribe(fi =>{
                this.functionInfo = fi;
                this.functionApp = fi.functionApp;
            });

        this.disabled = _broadcastService.getDirtyState("function_disabled");
        this.functionStatusOptions = [
            {
                displayLabel: this._translateService.instant(PortalResources.enabled),
                value: false
            }, {
                displayLabel: this._translateService.instant(PortalResources.disabled),
                value: true
            }];
        this.valueChange = new Subject<boolean>();
        this.valueChange
            .switchMap<FunctionInfo>((state, index) => {
                this.functionInfo.config.disabled = state;
                return this.functionApp.updateFunction(this.functionInfo);
            })
            .subscribe(fi => this.functionInfo.config.disabled = fi.config.disabled);
    }

    set selectedFunction(functionInfo : FunctionInfo){
        this._functionStream.next(functionInfo);
    }

    deleteFunction() {
        var result = confirm(this._translateService.instant(PortalResources.functionManage_areYouSure, { name: this.functionInfo.name }));
        if (result) {
            this._globalStateService.setBusyState();
            this._portalService.logAction("edit-component", "delete");
            this.functionApp.deleteFunction(this.functionInfo)
                .subscribe(r => {
                    this._broadcastService.broadcast(BroadcastEvent.FunctionDeleted, this.functionInfo);
                    this._globalStateService.clearBusyState();
                });
        }
    }
}