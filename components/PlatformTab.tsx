import React from 'react';
import { Task, AppActions, ProductService, RevenueTransaction, Deal } from '../types';
import { ProductsServicesTab } from './products';

export function PlatformTab({ 
    workspaceId,
    tasks,
    productsServices = [],
    actions,
    revenueTransactions = [],
    deals = []
}: {
    workspaceId: string;
    tasks: Task[];
    productsServices?: ProductService[];
    actions: AppActions;
    revenueTransactions?: RevenueTransaction[];
    deals?: Deal[];
}) {
    return (
        <ProductsServicesTab
            workspaceId={workspaceId}
            productsServices={productsServices}
            tasks={tasks}
            actions={actions}
            revenueTransactions={revenueTransactions}
            deals={deals}
        />
    );
}

export default PlatformTab;
