import { GetStaticProps } from 'next';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPrismicClient } from '../services/prismic';
import Header from '../components/Header';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  // TODO
  // console.log(postsPagination.next_page);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadMore, setLoadMore] = useState('');

  useEffect(() => {
    const latestPosts = postsPagination.results.map(post => {
      return {
        ...post,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          { locale: ptBR }
        ),
      };
    });
    setPosts(latestPosts);
    setLoadMore(postsPagination.next_page);
  }, [postsPagination.results, postsPagination.next_page]);

  console.log(loadMore);

  function handleLoadMore() {
    fetch(loadMore)
      .then(content => content.json())
      .then(response => {
        if (response.next_page !== null) {
          setLoadMore(response.next_page);
        } else {
          setLoadMore('');
        }

        const loadedPosts = response.results.map(post => ({
          uid: post.uid,
          first_publication_date: format(
            new Date(post.first_publication_date),
            'dd MMM yyyy',
            { locale: ptBR }
          ),
          data: {
            title: post.data.title,
            subtitle: post.data.subtitle,
            author: post.data.author,
          },
        }));

        setPosts([...posts, ...loadedPosts]);

        console.log(loadMore);
      });
  }

  return (
    <div className={styles.container}>
      <Header />
      <section className={styles.postList}>
        {posts.map(post => (
          <Link key={post.uid} href={`/post/${post.uid}`}>
            <a className={styles.post}>
              <h1>{post.data.title}</h1>
              <p>{post.data.subtitle}</p>
              <div>
                <time>
                  <FiCalendar />
                  {post.first_publication_date}
                </time>

                <p>
                  <FiUser />
                  {post.data.author}
                </p>
              </div>
            </a>
          </Link>
        ))}
      </section>
      {loadMore && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={handleLoadMore}
        >
          Carregar mais posts
        </button>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: [
        'posts.title',
        'posts.subtitle',
        'posts.author',
        'post.first_publication_date',
      ],
      pageSize: 1,
    }
  );

  // console.log(postsResponse);

  // TODO

  const results = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  // console.log(results.map(post => post.data.title));

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results,
      },
    },
    revalidate: 60 * 60 * 24, // 24 horas
  };
};
