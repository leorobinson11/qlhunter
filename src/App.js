import './styles/app.css';
import Sitemap from './components/sitemap';
import Schema from './components/schema';
import Info from './components/info'

const App = () => {
  return (
    <body>
      <header>
          <h1> QLHunter </h1>
      </header>
      <main>
          <section>
            <Sitemap /> 
          </section>
          <section>
            <Schema />
          </section>
          <section>
            <Info />
          </section>
      </main>
    </body>
  );
};

export default App;
