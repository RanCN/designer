/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { ConditionUtils } from '../../builders/condition-utils';
import { ScenarioInstance } from '../../services/scenario-instance';
import { ConditionCategory, ConditionEdge, ConditionType, Rule } from '../tv-enums';

export abstract class Condition {

	public abstract category: ConditionCategory;
	public abstract conditionType: ConditionType;
	public abstract label: string;
	public delay: number = 0;
	public edge: ConditionEdge = ConditionEdge.risingOrFalling;
	public passed: boolean;

	constructor () {
	}

	abstract hasPassed (): boolean;

	// abstract toXML (): any;

	hasRulePassed ( rule: Rule, left: number, right: number ): boolean {

		return ConditionUtils.hasRulePassed( rule, left, right );

	}

	reset () {
		this.passed = false;
	}

	protected get scenario () {
		return ScenarioInstance.scenario;
	}
}

