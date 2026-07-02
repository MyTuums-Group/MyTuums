import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:mytuums_mobile/src/mytuums_mobile_app.dart';
import 'package:mytuums_mobile/src/screens/shared.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart';

const int _postTextMaxLength = 500;

// ---------------------------------------------------------------------------
// Root shell: bottom NavigationBar + page switcher
// ---------------------------------------------------------------------------

class AppHomeScreen extends StatefulWidget {
  const AppHomeScreen({super.key});

  @override
  State<AppHomeScreen> createState() => _AppHomeScreenState();
}

class _AppHomeScreenState extends State<AppHomeScreen> {
  static const _feedKey = ValueKey('feed');
  static const _discoverKey = ValueKey('discover');
  static const _postKey = ValueKey('post');
  static const _profileKey = ValueKey('profile');

  Key _selectedKey = _feedKey;

  @override
  Widget build(BuildContext context) {
    final page = switch (_selectedKey) {
      _discoverKey => const DiscoverScreen(),
      _postKey => const ComposerScreen(),
      _profileKey => const ProfileScreen(),
      _ => const FeedScreen(),
    };

    return Scaffold(
      footers: [
        _AppBottomNavigation(
          selectedKey: _selectedKey,
          onSelected: (key) {
            if (key == null) return;
            setState(() => _selectedKey = key);
          },
        ),
      ],
      child: page,
    );
  }
}

class _AppBottomNavigation extends StatelessWidget {
  const _AppBottomNavigation({
    required this.selectedKey,
    required this.onSelected,
  });

  final Key selectedKey;
  final ValueChanged<Key?> onSelected;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.background,
        border: Border(top: BorderSide(color: colorScheme.border)),
      ),
      child: SafeArea(
        top: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: mobileMaxContentWidth + mobilePagePadding * 2,
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: SizedBox(
                width: double.infinity,
                child: NavigationBar(
                  selectedKey: selectedKey,
                  expanded: true,
                  alignment: NavigationBarAlignment.spaceEvenly,
                  backgroundColor: colorScheme.background,
                  onSelected: onSelected,
                  children: const [
                    NavigationItem(
                      key: _AppHomeScreenState._feedKey,
                      label: Text('Home'),
                      child: Icon(Icons.home),
                    ),
                    NavigationItem(
                      key: _AppHomeScreenState._discoverKey,
                      label: Text('Discover'),
                      child: Icon(Icons.search),
                    ),
                    NavigationItem(
                      key: _AppHomeScreenState._postKey,
                      label: Text('Post'),
                      child: Icon(Icons.add_box),
                    ),
                    NavigationItem(
                      key: _AppHomeScreenState._profileKey,
                      label: Text('Profile'),
                      child: Icon(Icons.person),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  var _following = false;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final items = _itemsFromPage(state.activeFeed);
    final showFavoritesPrompt =
        !_following && _hasNoFavoriteGames(state.activeFeed);

    return MyTuumsScaffold(
      actions: [
        IconButton.ghost(
          icon: const Icon(Icons.refresh),
          onPressed: _refreshFeed,
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionHeader(
            title: 'Home feed',
            description:
                'Fresh gaming posts from your world and the wider room.',
          ),
          const Gap(18),
          Tabs(
            index: _following ? 1 : 0,
            expand: true,
            onChanged: (index) {
              setState(() => _following = index == 1);
              _refreshFeed();
            },
            children: const [
              TabItem(child: Text('For You')),
              TabItem(child: Text('Following')),
            ],
          ),
          const Gap(16),
          if (showFavoritesPrompt) ...[
            const _FavoriteGamesPrompt(),
            const Gap(14),
          ],
          if (state.activeFeed == null)
            const _FeedSkeleton()
          else if (items.isEmpty)
            EmptyStateCard(
              icon: _following ? Icons.person_search : Icons.article_outlined,
              title: _following
                  ? 'Follow players to build this feed'
                  : 'No posts yet',
              message: _following
                  ? 'Following only shows posts from people you follow.'
                  : 'The global feed is ready. Create the first post to get things moving.',
            )
          else
            for (final item in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _PostTile(
                  post: item,
                  onTap: () => _openPostDetail(context, item),
                  onLike: _publicIdOf(item) == null
                      ? null
                      : () => _toggleLike(_publicIdOf(item)!),
                ),
              ),
        ],
      ),
    );
  }

  Future<void> _refreshFeed() {
    final state = AppScope.of(context);
    return _following
        ? state.refreshFollowingFeed()
        : state.refreshForYouFeed();
  }

  Future<void> _toggleLike(String publicId) async {
    final state = AppScope.of(context);
    await state.togglePostLike(publicId);
    if (!mounted) return;
    await _refreshFeed();
  }
}

class _FavoriteGamesPrompt extends StatelessWidget {
  const _FavoriteGamesPrompt();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const MutedIconTile(icon: Icons.auto_awesome),
            const Gap(12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Tune For You with favorite games').medium(),
                  const Gap(4),
                  Text(
                    'Until then, this shows the latest public posts.',
                    style: Theme.of(context).typography.small.copyWith(
                      color: colorScheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeedSkeleton extends StatelessWidget {
  const _FeedSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [LoadingCard(rows: 4), Gap(12), LoadingCard(rows: 3)],
    );
  }
}

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final _query = TextEditingController();
  Future<Map<String, dynamic>>? _search;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return MyTuumsScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionHeader(
            title: 'Discover',
            description: 'Find players, games, and the posts around them.',
          ),
          const Gap(16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Field(controller: _query, label: 'Search players and games'),
                  PrimaryAction(
                    label: 'Search',
                    onPressed: () => setState(() {
                      _search = state.search(_query.text.trim());
                    }),
                  ),
                ],
              ),
            ),
          ),
          const Gap(16),
          if (_search == null)
            const EmptyStateCard(
              icon: Icons.search,
              title: 'Start with a player or game',
              message:
                  'Search results will stay grouped so you can scan quickly.',
            )
          else
            FutureBuilder<Map<String, dynamic>>(
              future: _search,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const LoadingCard(rows: 4);
                }
                if (snapshot.hasError) {
                  return ErrorStateCard(snapshot.error.toString());
                }
                return _DiscoverResults(data: snapshot.data);
              },
            ),
        ],
      ),
    );
  }
}

class _DiscoverResults extends StatelessWidget {
  const _DiscoverResults({required this.data});

  final Map<String, dynamic>? data;

  @override
  Widget build(BuildContext context) {
    final users = _listFrom(data?['users']);
    final games = _listFrom(data?['games']);
    final fallbackResults = _itemsFromPage(data);

    if (users.isEmpty && games.isEmpty && fallbackResults.isEmpty) {
      return const EmptyStateCard(
        icon: Icons.search_off,
        title: 'No matches',
        message: 'Try another player name, handle, or game title.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (users.isNotEmpty)
          _SearchGroup(
            title: 'Users',
            icon: Icons.person,
            items: users,
            descriptionFor: (item) => '@${item['username'] ?? 'player'}',
          ),
        if (users.isNotEmpty && games.isNotEmpty) const Gap(14),
        if (games.isNotEmpty)
          _SearchGroup(
            title: 'Games',
            icon: Icons.sports_esports,
            items: games,
            descriptionFor: (_) => 'Game',
          ),
        if (users.isEmpty && games.isEmpty)
          _SearchGroup(
            title: 'Results',
            icon: Icons.search,
            items: fallbackResults,
            descriptionFor: (item) => item['kind']?.toString() ?? 'Result',
          ),
      ],
    );
  }
}

class _SearchGroup extends StatelessWidget {
  const _SearchGroup({
    required this.title,
    required this.icon,
    required this.items,
    required this.descriptionFor,
  });

  final String title;
  final IconData icon;
  final List<Map<String, dynamic>> items;
  final String Function(Map<String, dynamic> item) descriptionFor;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).typography.h4),
            const Gap(10),
            for (final item in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    MutedIconTile(icon: icon),
                    const Gap(12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_titleOf(item)).medium(),
                          const Gap(2),
                          Text(descriptionFor(item)).muted(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Composer (new post)
// ---------------------------------------------------------------------------

class ComposerScreen extends StatefulWidget {
  const ComposerScreen({super.key});

  @override
  State<ComposerScreen> createState() => _ComposerScreenState();
}

class _ComposerScreenState extends State<ComposerScreen> {
  final _text = TextEditingController();
  final _picker = ImagePicker();
  Future<List<Map<String, dynamic>>>? _games;
  String? _selectedGameId;
  String? _mediaAttachmentId;
  String? _mediaName;
  String? _mediaPath;
  var _uploading = false;

  int get _characterCount => _text.text.trim().runes.length;
  bool get _isTooLong => _characterCount > _postTextMaxLength;
  bool get _isEmpty => _text.text.trim().isEmpty;

  @override
  void initState() {
    super.initState();
    _text.addListener(_onTextChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _games ??= AppScope.of(context).games();
  }

  @override
  void dispose() {
    _text.removeListener(_onTextChanged);
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final colorScheme = Theme.of(context).colorScheme;
    final canSubmit = !_isEmpty && !_isTooLong && !_uploading;

    return MyTuumsScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionHeader(
            title: 'Share a public post',
            description:
                'Start a thread, drop a clip, or call out what you are playing.',
          ),
          const Gap(16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const MutedIconTile(icon: Icons.edit),
                      const Gap(12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Compose').medium(),
                            const Gap(4),
                            Text(
                              'Keep it readable, specific, and gaming-focused.',
                              style: Theme.of(context).typography.small
                                  .copyWith(color: colorScheme.mutedForeground),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Gap(16),
                  Field(
                    controller: _text,
                    label: 'What are you playing right now?',
                    maxLines: 7,
                  ),
                  FutureBuilder<List<Map<String, dynamic>>>(
                    future: _games,
                    builder: (context, snapshot) {
                      final games =
                          snapshot.data ?? const <Map<String, dynamic>>[];
                      return _GameTagSelect(
                        games: games,
                        selectedGameId: _selectedGameId,
                        loading:
                            snapshot.connectionState != ConnectionState.done,
                        onChanged: (value) {
                          setState(() => _selectedGameId = value);
                        },
                      );
                    },
                  ),
                  const Gap(12),
                  MediaAttachmentPanel(
                    mediaName: _mediaName,
                    mediaPath: _mediaPath,
                    uploading: _uploading,
                    onPick: _uploading ? null : () => _pickImage(context),
                    onRemove: _clearMedia,
                  ),
                  const Gap(12),
                  Row(
                    children: [
                      Text(
                        '$_characterCount / $_postTextMaxLength',
                        style: Theme.of(context).typography.small.copyWith(
                          color: _isTooLong
                              ? colorScheme.destructive
                              : colorScheme.mutedForeground,
                        ),
                      ),
                      const Spacer(),
                      PrimaryButton(
                        onPressed: canSubmit
                            ? () async {
                                await state.createPost(
                                  _text.text,
                                  mediaAttachmentId: _mediaAttachmentId,
                                  gameTagId: _selectedGameId,
                                );
                                if (mounted && state.errorMessage == null) {
                                  _text.clear();
                                  _clearMedia();
                                  setState(() => _selectedGameId = null);
                                }
                              }
                            : null,
                        child: Text(_uploading ? 'Uploading...' : 'Post'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _onTextChanged() {
    setState(() {});
  }

  Future<void> _pickImage(BuildContext context) async {
    final file = await _picker.pickImage(source: ImageSource.gallery);
    if (file == null || !context.mounted) return;
    setState(() {
      _uploading = true;
      _mediaName = file.name;
      _mediaPath = file.path;
      _mediaAttachmentId = null;
    });
    final mediaId = await AppScope.of(context).uploadPostImage(file);
    if (!mounted) return;
    setState(() {
      _uploading = false;
      _mediaAttachmentId = mediaId;
      if (mediaId == null) {
        _mediaName = null;
        _mediaPath = null;
      }
    });
  }

  void _clearMedia() {
    setState(() {
      _mediaAttachmentId = null;
      _mediaName = null;
      _mediaPath = null;
      _uploading = false;
    });
  }
}

class _GameTagSelect extends StatelessWidget {
  const _GameTagSelect({
    required this.games,
    required this.selectedGameId,
    required this.loading,
    required this.onChanged,
  });

  final List<Map<String, dynamic>> games;
  final String? selectedGameId;
  final bool loading;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final typography = Theme.of(context).typography;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Game tag',
          style: typography.small.copyWith(fontWeight: FontWeight.w500),
        ),
        const Gap(6),
        SizedBox(
          width: double.infinity,
          child: Select<String>(
            value: selectedGameId,
            enabled: !loading && games.isNotEmpty,
            placeholder: Text(loading ? 'Loading games...' : 'No game tag'),
            popup: SelectPopup<String>(
              items: SelectItemList(
                children: [
                  const SelectItemButton<String>(
                    value: '',
                    child: Text('No game tag'),
                  ),
                  for (final game in games)
                    SelectItemButton<String>(
                      value: game['id']?.toString() ?? '',
                      child: Text(game['name']?.toString() ?? 'Game'),
                    ),
                ],
              ),
            ).call,
            itemBuilder: (context, value) => Text(_gameName(games, value)),
            onChanged: (value) => onChanged(value == '' ? null : value),
          ),
        ),
      ],
    );
  }
}

class MediaAttachmentPanel extends StatelessWidget {
  const MediaAttachmentPanel({
    required this.mediaName,
    required this.mediaPath,
    required this.uploading,
    required this.onPick,
    required this.onRemove,
    this.showPreview = true,
    super.key,
  });

  final String? mediaName;
  final String? mediaPath;
  final bool uploading;
  final VoidCallback? onPick;
  final VoidCallback onRemove;
  final bool showPreview;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final hasMedia = mediaName != null && mediaPath != null;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.muted.scaleAlpha(0.45),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: colorScheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const MutedIconTile(icon: Icons.image),
              const Gap(10),
              Expanded(
                child: Text(
                  uploading
                      ? 'Uploading attachment...'
                      : hasMedia
                      ? mediaName!
                      : 'Attach an image',
                ).medium(),
              ),
              OutlineButton(
                onPressed: onPick,
                child: Text(hasMedia ? 'Replace' : 'Choose'),
              ),
            ],
          ),
          if (hasMedia && showPreview) ...[
            const Gap(12),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.file(
                File(mediaPath!),
                height: 180,
                fit: BoxFit.cover,
              ),
            ),
          ],
          if (hasMedia) ...[
            const Gap(8),
            GhostButton(
              onPressed: onRemove,
              child: const Text('Remove attachment'),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final profile = state.sessionState?['profile'];
    final username = profile is Map<String, dynamic>
        ? profile['username']?.toString()
        : null;
    final displayName = profile is Map<String, dynamic>
        ? profile['displayName']?.toString()
        : null;
    final bio = profile is Map<String, dynamic>
        ? profile['bio']?.toString()
        : null;
    final title = displayName?.isNotEmpty == true
        ? displayName!
        : username?.isNotEmpty == true
        ? username!
        : 'Connected account';

    return MyTuumsScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionHeader(
            title: 'Profile',
            description: 'Your handle-first identity on MyTuums.',
          ),
          const Gap(16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _AvatarCircle(title, size: 76),
                  const Gap(16),
                  Text(title).large().medium(),
                  if (username != null && username.isNotEmpty) ...[
                    const Gap(4),
                    Text('@$username').muted(),
                  ],
                  if (bio != null && bio.isNotEmpty) ...[
                    const Gap(14),
                    PageDescription(bio, centered: true),
                  ],
                  const Gap(18),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: const [
                      MetricPill(icon: Icons.badge, label: 'Profile ready'),
                      MetricPill(icon: Icons.lock, label: 'Session active'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const Gap(16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Account').medium(),
                  const Gap(4),
                  const PageDescription(
                    'Sign out of this device when you are done.',
                  ),
                  const Gap(12),
                  OutlineButton(
                    onPressed: state.logout,
                    child: const Text('Log out'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Post tile (feed card)
// ---------------------------------------------------------------------------

class _PostTile extends StatelessWidget {
  const _PostTile({required this.post, required this.onTap, this.onLike});

  final Map<String, dynamic> post;
  final VoidCallback onTap;
  final VoidCallback? onLike;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final author = _authorOf(post);
    final username = author['username']?.toString() ?? '';
    final displayName = author['displayName']?.toString();
    final authorName = displayName?.isNotEmpty == true
        ? displayName!
        : username.isNotEmpty
        ? '@$username'
        : _titleOf(post);
    final text = post['text']?.toString() ?? '';
    final gameTag = _mapFrom(post['gameTag']);
    final media = _mapFrom(post['media']);
    final liked = post['likedByViewer'] == true;
    final likeCount = _countOf(post['likeCount']);
    final commentCount = _countOf(post['commentCount']);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Clickable(
              onPressed: onTap,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _AvatarCircle(authorName),
                  const Gap(10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(authorName).medium(),
                        if (username.isNotEmpty) ...[
                          const Gap(2),
                          Text('@$username').muted(),
                        ],
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: colorScheme.mutedForeground),
                ],
              ),
            ),
            if (text.isNotEmpty) ...[const Gap(14), Text(text)],
            if (gameTag != null) ...[
              const Gap(12),
              _GameChip(label: gameTag['name']?.toString() ?? 'Game'),
            ],
            if (media != null) ...[
              const Gap(12),
              _PostMediaPreview(media: media),
            ],
            const Gap(14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                MetricPill(
                  icon: liked ? Icons.favorite : Icons.favorite_border,
                  label: _countLabel(likeCount, 'like'),
                  active: liked,
                  onPressed: onLike,
                ),
                MetricPill(
                  icon: Icons.chat_bubble_outline,
                  label: _countLabel(commentCount, 'comment'),
                ),
                GhostButton(onPressed: onTap, child: const Text('Open post')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _GameChip extends StatelessWidget {
  const _GameChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.muted,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.border),
      ),
      child: Text(
        label,
        style: Theme.of(context).typography.xSmall.copyWith(
          color: colorScheme.mutedForeground,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _PostMediaPreview extends StatelessWidget {
  const _PostMediaPreview({required this.media});

  final Map<String, dynamic> media;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final url = media['url']?.toString();
    final kind = media['kind']?.toString();
    if (url == null || url.isEmpty) return const SizedBox.shrink();

    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 280),
        color: colorScheme.muted,
        child: kind == 'video'
            ? Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const MutedIconTile(icon: Icons.play_circle),
                    const Gap(12),
                    Expanded(child: Text('Video attachment').medium()),
                  ],
                ),
              )
            : Image.network(url, width: double.infinity, fit: BoxFit.cover),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Post detail
// ---------------------------------------------------------------------------

class PostDetailScreen extends StatefulWidget {
  const PostDetailScreen({required this.publicId, super.key});

  final String publicId;

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  final _comment = TextEditingController();
  Future<Map<String, dynamic>>? _detail;
  Future<Map<String, dynamic>>? _comments;
  var _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loaded) return;
    final state = AppScope.of(context);
    _detail = state.postDetail(widget.publicId);
    _comments = state.comments(widget.publicId);
    _loaded = true;
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return MyTuumsScaffold(
      leading: [
        IconButton.ghost(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
      actions: [
        IconButton.ghost(
          icon: const Icon(Icons.flag),
          onPressed: () => _openReportSheet(context, widget.publicId),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FutureBuilder<Map<String, dynamic>>(
            future: _detail,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const LoadingCard(rows: 4);
              }
              if (snapshot.hasError) {
                return ErrorStateCard(snapshot.error.toString());
              }
              final post = snapshot.data ?? const <String, dynamic>{};
              return _PostTile(
                post: post,
                onTap: () {},
                onLike: () => state.togglePostLike(widget.publicId),
              );
            },
          ),
          const Gap(18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Comments', style: Theme.of(context).typography.h4),
                  const Gap(12),
                  Field(
                    controller: _comment,
                    label: 'Your comment',
                    maxLines: 3,
                  ),
                  PrimaryAction(
                    label: 'Comment',
                    onPressed: () async {
                      await state.createComment(
                        publicId: widget.publicId,
                        text: _comment.text.trim(),
                      );
                      if (mounted) {
                        setState(() {
                          _comment.clear();
                          _comments = state.comments(widget.publicId);
                        });
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
          const Gap(16),
          FutureBuilder<Map<String, dynamic>>(
            future: _comments,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const LoadingCard(rows: 3);
              }
              if (snapshot.hasError) {
                return ErrorStateCard(snapshot.error.toString());
              }
              final comments = _itemsFromPage(snapshot.data);
              if (comments.isEmpty) {
                return const EmptyStateCard(
                  icon: Icons.chat_bubble_outline,
                  title: 'No comments yet',
                  message: 'Start the conversation under this post.',
                );
              }
              return Column(
                children: [
                  for (final comment in comments)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _AvatarCircle(_titleOf(comment)),
                              const Gap(10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(_titleOf(comment)).medium(),
                                    const Gap(4),
                                    Text(comment['text']?.toString() ?? ''),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Report bottom sheet
// ---------------------------------------------------------------------------

void _openReportSheet(BuildContext context, String publicId) {
  final notes = TextEditingController();
  var reason = 'spam';
  openSheet<void>(
    context: context,
    position: OverlayPosition.bottom,
    builder: (sheetContext) {
      final state = AppScope.of(context);
      return StatefulBuilder(
        builder: (ctx, setSheetState) {
          final colorScheme = Theme.of(ctx).colorScheme;
          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: colorScheme.mutedForeground,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const Gap(16),
                const PageTitle('Report', centered: true),
                const Gap(16),
                for (final option in const [
                  ('spam', 'Spam'),
                  ('harassment', 'Harassment'),
                  ('illegal_or_dangerous', 'Illegal or dangerous'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: reason == option.$1
                        ? PrimaryButton(
                            onPressed: () {},
                            child: Text(option.$2),
                          )
                        : OutlineButton(
                            onPressed: () =>
                                setSheetState(() => reason = option.$1),
                            child: Text(option.$2),
                          ),
                  ),
                const Gap(8),
                Field(controller: notes, label: 'Notes', maxLines: 3),
                PrimaryAction(
                  label: 'Send report',
                  onPressed: () async {
                    await state.report(
                      target: {'type': 'post', 'publicId': publicId},
                      reason: reason,
                      notes: notes.text.trim(),
                    );
                    if (sheetContext.mounted) {
                      await closeSheet(sheetContext);
                    }
                  },
                ),
              ],
            ),
          );
        },
      );
    },
  );
}

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

void _openPostDetail(BuildContext context, Map<String, dynamic> item) {
  final publicId = _publicIdOf(item);
  if (publicId == null || publicId.isEmpty) return;
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => AppScope(
        state: AppScope.of(context),
        child: PostDetailScreen(publicId: publicId),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Shared private helpers
// ---------------------------------------------------------------------------

class _AvatarCircle extends StatelessWidget {
  const _AvatarCircle(this.label, {this.size = 36});

  final String label;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Avatar(
      initials: _initials(label),
      size: size,
      backgroundColor: Theme.of(context).colorScheme.primary,
    );
  }
}

List<Map<String, dynamic>> _itemsFromPage(Map<String, dynamic>? page) {
  if (page == null) return [];
  for (final key in const ['items', 'results', 'posts', 'data']) {
    final candidate = page[key];
    if (candidate is List) {
      return candidate.whereType<Map<String, dynamic>>().toList();
    }
  }
  return [];
}

List<Map<String, dynamic>> _listFrom(Object? value) {
  if (value is List) return value.whereType<Map<String, dynamic>>().toList();
  return [];
}

Map<String, dynamic>? _mapFrom(Object? value) {
  return value is Map<String, dynamic> ? value : null;
}

Map<String, dynamic> _authorOf(Map<String, dynamic> value) {
  final author = _mapFrom(value['author']);
  if (author != null) return author;
  return {
    'username':
        value['authorUsername']?.toString() ?? value['username']?.toString(),
    'displayName': value['displayName']?.toString(),
  };
}

String? _publicIdOf(Map<String, dynamic> value) {
  return value['publicId']?.toString() ?? value['id']?.toString();
}

String _titleOf(Map<String, dynamic> value) {
  return value['title']?.toString() ??
      value['label']?.toString() ??
      value['displayName']?.toString() ??
      value['username']?.toString() ??
      value['authorUsername']?.toString() ??
      value['publicId']?.toString() ??
      'MyTuums';
}

String _initials(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return '?';
  final parts = trimmed.split(RegExp(r'\s+'));
  if (parts.length == 1) {
    return parts.first
        .substring(0, parts.first.length >= 2 ? 2 : 1)
        .toUpperCase();
  }
  return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
}

int _countOf(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

String _countLabel(int value, String noun) {
  return '$value $noun${value == 1 ? '' : 's'}';
}

String _gameName(List<Map<String, dynamic>> games, String id) {
  for (final game in games) {
    if (game['id']?.toString() == id) {
      return game['name']?.toString() ?? 'Game';
    }
  }
  return 'No game tag';
}

bool _hasNoFavoriteGames(Map<String, dynamic>? page) {
  final context = _mapFrom(page?['context']);
  return context?['kind'] == 'for_you' && context?['hasFavoriteGames'] == false;
}
