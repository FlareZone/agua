import React, {createContext, memo, useCallback, useContext, useMemo, useState} from 'react';
// eslint-disable-next-line import/no-named-as-default
import NProgress from 'nprogress';
import {useMigratable} from '@vaults/contexts/useMigratable';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useBalances} from '@yearn-finance/web-lib/hooks/useBalances';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {useClientEffect} from '@yearn-finance/web-lib/hooks/useClientEffect';
import {getProvider} from '@yearn-finance/web-lib/utils/web3/providers';
import {useYearn} from '@common/contexts/useYearn';

import type {ReactElement} from 'react';
import type {TBalanceData, TUseBalancesTokens} from '@yearn-finance/web-lib/hooks/types';
import type {TDict} from '@yearn-finance/web-lib/utils/types';
import type {TYearnVault} from '@common/types/yearn';

export type	TMigratableWalletContext = {
	balances: TDict<TBalanceData>,
	useWalletNonce: number,
	isLoading: boolean,
	refresh: () => Promise<TDict<TBalanceData>>
}

const	defaultProps = {
	balances: {},
	useWalletNonce: 0,
	isLoading: true,
	refresh: async (): Promise<TDict<TBalanceData>> => ({})
};


/* 🔵 - Yearn Finance **********************************************************
** This context controls most of the user's wallet data we may need to
** interact with our app, aka mostly the balances and the token prices.
******************************************************************************/
const	MigratableWalletContext = createContext<TMigratableWalletContext>(defaultProps);
export const MigratableWalletContextApp = memo(function MigratableWalletContextApp({children}: {children: ReactElement}): ReactElement {
	const	[nonce, set_nonce] = useState<number>(0);
	const	{provider} = useWeb3();
	const	{prices} = useYearn();
	const	{chainID} = useChainID();
	const	{migratable, isLoadingMigratableList} = useMigratable();

	const	availableTokens = useMemo((): TUseBalancesTokens[] => {
		if (isLoadingMigratableList) {
			return [];
		}
		const	tokens: TUseBalancesTokens[] = [];
		Object.values(migratable || {}).forEach((vault?: TYearnVault): void => {
			if (!vault) {
				return;
			}
			tokens.push({token: vault?.address});
		});
		return tokens;
	}, [migratable, isLoadingMigratableList]);

	const	{data: balances, update: updateBalances, isLoading: isLoadingBalances} = useBalances({
		key: chainID,
		provider: provider || getProvider(1),
		tokens: availableTokens,
		prices
	});

	const	onRefresh = useCallback(async (): Promise<TDict<TBalanceData>> => {
		const updatedBalances = await updateBalances();
		return updatedBalances;
	}, [updateBalances]);

	useClientEffect((): () => void => {
		if (isLoadingBalances) {
			if (!balances) {
				set_nonce(nonce + 1);
			}
			NProgress.start();
		} else {
			NProgress.done();
		}
		return (): unknown => NProgress.done();
	}, [isLoadingBalances]);

	/* 🔵 - Yearn Finance ******************************************************
	**	Setup and render the Context provider to use in the app.
	***************************************************************************/
	const	contextValue = useMemo((): TMigratableWalletContext => ({
		balances: balances,
		isLoading: isLoadingBalances,
		refresh: onRefresh,
		useWalletNonce: nonce
	}), [balances, isLoadingBalances, onRefresh, nonce]);

	return (
		<MigratableWalletContext.Provider value={contextValue}>
			{children}
		</MigratableWalletContext.Provider>
	);
});


export const useMigratableWallet = (): TMigratableWalletContext => useContext(MigratableWalletContext);
export default useMigratableWallet;