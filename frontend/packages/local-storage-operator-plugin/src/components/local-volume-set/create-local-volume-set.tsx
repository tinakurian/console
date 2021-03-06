import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { match as RouterMatch } from 'react-router';
import { Form, TextVariants } from '@patternfly/react-core';
import { resourcePathFromModel, BreadCrumbs } from '@console/internal/components/utils';
import { history } from '@console/internal/components/utils/router';
import { k8sCreate, NodeKind, referenceForModel } from '@console/internal/module/k8s';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { ClusterServiceVersionModel } from '@console/operator-lifecycle-manager';
import { LocalVolumeSetModel } from '../../models';
import { reducer, initialState } from './state';
import { nodeResource } from '../../resources';
import { hasNoTaints, getNodesByHostNameLabel } from '../../utils';
import { getLocalVolumeSetRequestData } from './request';
import { LocalVolumeSetBody } from './body';
import { LocalVolumeSetHeader } from './header';
import { FormFooter } from '../common/form-footer';
import './create-local-volume-set.scss';

const CreateLocalVolumeSet: React.FC<CreateLocalVolumeSetProps> = ({ match }) => {
  const { appName, ns } = match.params;
  const resourcePath = resourcePathFromModel(ClusterServiceVersionModel, appName, ns);

  const { t } = useTranslation();
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [nodesData, nodesLoaded, nodesLoadError] = useK8sWatchResource<NodeKind[]>(nodeResource);
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState('');

  React.useEffect(() => {
    if (nodesLoaded && !nodesLoadError && nodesData?.length !== 0) {
      const filteredNodes: NodeKind[] = nodesData.filter(hasNoTaints);
      dispatch({ type: 'setLvsAllNodes', value: filteredNodes });
    }
  }, [nodesData, nodesLoadError, nodesLoaded]);

  const onSubmit = async (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    setInProgress(true);

    const lvsNodes = state.lvsIsSelectNodes ? state.lvsSelectNodes : nodesData;
    const nodesByHostNameLabel = getNodesByHostNameLabel(lvsNodes);
    const requestData = getLocalVolumeSetRequestData(state, nodesByHostNameLabel, ns);

    try {
      await k8sCreate(LocalVolumeSetModel, ns, requestData);
      setInProgress(false);
      history.push(
        `/k8s/ns/${ns}/clusterserviceversions/${appName}/${referenceForModel(
          LocalVolumeSetModel,
        )}/${state.volumeSetName}`,
      );
    } catch (err) {
      setError(err.message);
      setInProgress(false);
    }
  };

  const getDisabledCondition = () => {
    const nodes = state.lvsIsSelectNodes ? state.lvsSelectNodes : state.lvsAllNodes;
    if (!state.volumeSetName.trim().length) return true;
    if (nodes.length < 1) return true;
    if (!state.isValidDiskSize) return true;
    return false;
  };

  return (
    <>
      <div className="co-create-operand__header">
        <div className="co-create-operand__header-buttons">
          <BreadCrumbs
            breadcrumbs={[
              {
                name: t('lso-plugin~Local Storage'),
                path: resourcePath,
              },
              { name: t('lso-plugin~Create Local Volume Set'), path: '' },
            ]}
          />
        </div>
        <LocalVolumeSetHeader variant={TextVariants.h1} />
      </div>
      <Form
        noValidate={false}
        className="co-m-pane__body lso-form-body__node-list"
        onSubmit={onSubmit}
      >
        <LocalVolumeSetBody dispatch={dispatch} state={state} />
        <FormFooter
          errorMessage={errorMessage}
          inProgress={inProgress}
          cancelUrl={resourcePath}
          disableNext={getDisabledCondition()}
        />
      </Form>
    </>
  );
};

type CreateLocalVolumeSetProps = {
  match: RouterMatch<{ appName: string; ns: string }>;
};

export default CreateLocalVolumeSet;
