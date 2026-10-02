// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DESIGN } from '@/lib/editor/design';
import { SAMPLE_FACTS } from '@/components/cards';
import { Editor } from './Editor';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const user = { id: 'u1', name: 'Mira Kato', image: null, plan: 'free' as const, githubLogin: 'mkato' };
const features = { auth: true, storage: false, video: false, billing: false, social: false };

beforeAll(() => {
  // jsdom has neither; the canvas fit effect and CardScaler need them.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    url.startsWith('/api/pr?')
      ? new Response(JSON.stringify(SAMPLE_FACTS), { status: 200, headers: { 'content-type': 'application/json', 'x-pr-cache': 'miss' } })
      : new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })));
});

afterEach(cleanup); // vitest runs without globals, so RTL's auto-cleanup is not registered

describe('<Editor />', () => {
  it('renders the shell, the stage card and the toolbar without a PR imported', async () => {
    const { getByLabelText, getByText, container } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={null} />,
    );
    expect(container.querySelector('.ed-header')).toBeTruthy();
    expect(container.querySelector('.ed-canvas')).toBeTruthy();
    // No facts yet: the empty state offers the import pill, and Remove is unavailable.
    expect(getByLabelText('Pull request URL')).toBeTruthy();
    expect(getByText('Remove').closest('button')?.disabled).toBe(true);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/pr/recent'));
  });

  it('renders the card family for imported facts', () => {
    const { container, getByText } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={SAMPLE_FACTS} />,
    );
    expect(container.querySelector('.pc-midnight.pc-standard')).toBeTruthy();
    expect(getByText(SAMPLE_FACTS.title)).toBeTruthy();
    expect(container.querySelector('.bf-url')?.textContent).toBe('github.com/acme/review-pane/pull/4821');
  });

  it('imports a pasted pull-request link through /api/pr', async () => {
    const { getByLabelText, getByText, container } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={null} />,
    );
    const input = getByLabelText('Pull request URL');
    fireEvent.change(input, { target: { value: 'https://github.com/acme/review-pane/pull/4821' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(container.querySelector('.pc-midnight')).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith('/api/pr?owner=acme&repo=review-pane&number=4821');
    expect(getByText('Imported review-pane #4821')).toBeTruthy();
  });

  it('undoes a design change on ctrl/cmd+Z', () => {
    const { getByText } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={SAMPLE_FACTS} />,
    );
    fireEvent.click(getByText('BG'));
    const crimson = () => getByText('Crimson').closest('button')!;
    fireEvent.click(crimson());
    expect(crimson().dataset.selected).toBe('true');
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(crimson().dataset.selected).toBeUndefined();
    expect(getByText('Ember').closest('button')!.dataset.selected).toBe('true');
  });
});
