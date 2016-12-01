import {Component, OnInit, EventEmitter, Input, Output} from '@angular/core';
import {ArmService} from '../../services/arm.service';
import {TreeNode} from './tree-node';

@Component({
    selector: 'tree-view',
    templateUrl: 'app/components/treeview/tree-view.component.html',
    directives: [TreeViewComponent],
    inputs: ['node', 'levelInput', 'inSearchMode']
})

export class TreeViewComponent{
    node : TreeNode;
    margin : string;
    level : number;
    inSearchMode : boolean;

    constructor(private _armService : ArmService) {
    }

    set levelInput(level : number){
        let margin = level * 15;
        this.margin = margin + "px";
        this.level = level;
    }
}