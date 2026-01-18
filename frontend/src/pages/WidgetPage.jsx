import React from 'react';
import { createGamePages } from '../../../../shared-core/pages/createGamePages';

const { Widget } = createGamePages('mines');

export function WidgetPage() {
  return <Widget />;
}

export default WidgetPage;
